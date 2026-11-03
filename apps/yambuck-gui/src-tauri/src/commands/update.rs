//! In-app updates, per the Release and Update Standard
//! (https://github.com/jackbrumley/jackbrumley.github.io/blob/main/RELEASE_STANDARD.md):
//! the update check reads GitHub's latest release, and installing an update
//! re-runs the same one-line installer a new user runs.

use std::path::{Path, PathBuf};
use std::process::Stdio;

use serde::{Deserialize, Serialize};

use crate::support::logging::append_log;

pub(crate) const GITHUB_LATEST_RELEASE_API_URL: &str =
    "https://api.github.com/repos/yambuck/yambuck/releases/latest";
const INSTALL_SITE: &str = "https://yambuck.com";
const PRODUCT_NAME: &str = "Yambuck";
/// install.sh installs here with `--system`; anywhere else is a user install
/// (`~/.local/bin`, the installer's default).
const SYSTEM_INSTALL_DIR: &str = "/usr/local/bin";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    current_version: String,
    latest_version: String,
    update_available: bool,
    release_url: String,
    notes_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubLatestRelease {
    tag_name: String,
    html_url: String,
    body: Option<String>,
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateCheckResult, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let _ = append_log(
        "INFO",
        &format!("Checking updates from {GITHUB_LATEST_RELEASE_API_URL}"),
    );

    let client = reqwest::Client::builder()
        .build()
        .map_err(|error| format!("Failed to build update client: {error}"))?;

    let response = client
        .get(GITHUB_LATEST_RELEASE_API_URL)
        .header(reqwest::header::USER_AGENT, "yambuck-update-checker")
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| format!("Failed to fetch latest release: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Latest release request failed with status {}",
            response.status()
        ));
    }

    let latest_release: GitHubLatestRelease = response
        .json()
        .await
        .map_err(|error| format!("Failed to decode latest release response: {error}"))?;

    let latest_version = normalize_version(&latest_release.tag_name).ok_or_else(|| {
        format!(
            "Invalid latest release version tag: {}",
            latest_release.tag_name
        )
    })?;

    let parsed_current = parse_version(&current_version)
        .ok_or_else(|| format!("Invalid current app version: {current_version}"))?;
    let parsed_latest = parse_version(&latest_version)
        .ok_or_else(|| format!("Invalid latest app version: {latest_version}"))?;

    let update_available = parsed_latest > parsed_current;
    let _ = append_log(
        "INFO",
        &format!(
            "Update check: current={current_version} latest={latest_version} available={update_available}"
        ),
    );

    Ok(UpdateCheckResult {
        current_version,
        latest_version,
        update_available,
        notes_url: latest_release
            .body
            .filter(|body| !body.trim().is_empty())
            .map(|_| latest_release.html_url.clone()),
        release_url: latest_release.html_url,
    })
}

/// Starts the installer in a detached process, then exits so the installer
/// can replace this installation. The installer relaunches the new version;
/// if it fails, the still-installed version is relaunched with
/// `--update-failed`.
#[tauri::command]
pub async fn install_update(app_handle: tauri::AppHandle) -> Result<(), String> {
    let _ = append_log("INFO", "Starting in-app update");

    spawn_update_process()?;

    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(600)).await;
        let _ = append_log(
            "INFO",
            &format!("Exiting {PRODUCT_NAME} for update installation"),
        );
        handle.exit(0);
    });

    Ok(())
}

/// The install command that replaces this installation in place. A system
/// install (`/usr/local/bin`) must stay a system install; install.sh then
/// obtains root itself (cached sudo, or a graphical pkexec prompt when there
/// is no terminal, as here).
fn update_command(current_exe: Option<&Path>) -> String {
    let is_system_install = current_exe.is_some_and(|path| path.starts_with(SYSTEM_INSTALL_DIR));

    if is_system_install {
        format!("curl -sf {INSTALL_SITE}/install.sh | bash -s -- --system")
    } else {
        format!("curl -sf {INSTALL_SITE}/install.sh | bash")
    }
}

/// The installer's output, and what the update-failed dialog opens.
/// install.sh appends its own timestamped lines to the same file.
pub(crate) fn update_log_path() -> PathBuf {
    let debug_dir = dirs::config_dir()
        .map(|dir| dir.join("yambuck").join("debug"))
        .unwrap_or_else(std::env::temp_dir);
    let _ = std::fs::create_dir_all(&debug_dir);
    debug_dir.join("update.log")
}

/// A fresh update log, as the updater's stdout and stderr. Opened in append
/// mode because install.sh also appends to the file directly: a plain write
/// handle would overwrite those lines at its own offset.
fn update_log_outputs() -> Result<(Stdio, Stdio), String> {
    let path = update_log_path();
    std::fs::write(&path, "").map_err(|error| format!("Failed to reset update log: {error}"))?;
    let log_file = std::fs::OpenOptions::new()
        .append(true)
        .open(&path)
        .map_err(|error| format!("Failed to open update log file: {error}"))?;
    let log_file_err = log_file
        .try_clone()
        .map_err(|error| format!("Failed to clone update log handle: {error}"))?;
    Ok((Stdio::from(log_file), Stdio::from(log_file_err)))
}

/// Wraps `value` in single quotes for bash, which takes everything inside
/// literally (an embedded quote closes, escapes and reopens).
fn bash_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', r"'\''"))
}

/// Runs the installer, and if it fails relaunches the installed version with
/// `--update-failed` so the user is told instead of the app just vanishing.
/// `pipefail` makes a failed download fail the update rather than piping an
/// empty script into bash.
fn update_script(current_exe: Option<&Path>) -> String {
    let relaunch = match current_exe {
        Some(path) => {
            let path = bash_single_quote(&path.to_string_lossy());
            format!("if [ -x {path} ]; then {path} --update-failed >/dev/null 2>&1 & fi")
        }
        None => "echo \"[yambuck] No installed version found to relaunch\"".to_string(),
    };
    format!(
        r#"set -o pipefail
{install}
status=$?
if [ "$status" -ne 0 ]; then
  echo "[yambuck] Update failed (exit $status); relaunching the installed version"
  {relaunch}
fi
"#,
        install = update_command(current_exe),
    )
}

fn spawn_update_process() -> Result<(), String> {
    use std::os::unix::process::CommandExt;

    let current_exe = std::env::current_exe().ok();
    let script = update_script(current_exe.as_deref());
    let _ = append_log("INFO", &format!("Spawning update process:\n{script}"));
    let (stdout, stderr) = update_log_outputs()?;

    let mut command = std::process::Command::new("bash");
    command
        .arg("-c")
        .arg(script)
        .stdin(Stdio::null())
        .stdout(stdout)
        .stderr(stderr);

    // SAFETY: setsid only detaches the child from this process's session, so
    // the updater survives Yambuck exiting.
    unsafe {
        command.pre_exec(|| {
            libc::setsid();
            Ok(())
        });
    }

    command
        .spawn()
        .map_err(|error| format!("Failed to spawn updater process: {error}"))?;

    Ok(())
}

/// Shown when the updater relaunched this (old) version after the installer
/// failed, so a failed update is never silent.
pub fn show_update_failed_dialog(app_handle: &tauri::AppHandle) {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

    let log_path = update_log_path();
    let _ = append_log(
        "WARN",
        &format!(
            "Relaunched after a failed update; details in {}",
            log_path.display()
        ),
    );
    app_handle
        .dialog()
        .message(format!(
            "{PRODUCT_NAME} could not install the update, so this version is still installed.\n\nThe installer's output is in:\n{}\n\nIf the update needed administrator permission, it fails when that prompt is cancelled. You can also update from a terminal:\n{}",
            log_path.display(),
            update_command(std::env::current_exe().ok().as_deref()),
        ))
        .title("Update failed")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Open Update Log".to_string(),
            "Close".to_string(),
        ))
        .show(move |open_log| {
            if open_log {
                if let Err(error) = tauri_plugin_opener::open_path(&log_path, None::<&str>) {
                    let _ = append_log("WARN", &format!("Failed to open the update log: {error}"));
                }
            }
        });
}

fn normalize_version(raw: &str) -> Option<String> {
    let trimmed = raw.trim().trim_start_matches('v');
    let parsed = parse_version(trimmed)?;
    Some(format!("{}.{}.{}", parsed.0, parsed.1, parsed.2))
}

fn parse_version(value: &str) -> Option<(u64, u64, u64)> {
    let sanitized = value.trim();
    if sanitized.is_empty() {
        return None;
    }

    let core = sanitized
        .split_once('-')
        .map_or(sanitized, |(left, _)| left);
    let mut segments = core.split('.');

    let major = segments.next()?.parse::<u64>().ok()?;
    let minor = segments.next()?.parse::<u64>().ok()?;
    let patch = segments.next()?.parse::<u64>().ok()?;

    if segments.next().is_some() {
        return None;
    }

    Some((major, minor, patch))
}

#[cfg(test)]
mod tests {
    use super::{bash_single_quote, normalize_version, update_command, update_script};
    use std::path::Path;

    #[test]
    fn bash_quoting_keeps_paths_literal() {
        assert_eq!(
            bash_single_quote("/usr/local/bin/yambuck"),
            "'/usr/local/bin/yambuck'"
        );
        assert_eq!(
            bash_single_quote("/home/o'brien/My Apps $HOME/yambuck"),
            r"'/home/o'\''brien/My Apps $HOME/yambuck'"
        );
    }

    #[test]
    fn versions_normalize_from_tags() {
        assert_eq!(normalize_version("v0.3.6").as_deref(), Some("0.3.6"));
        assert_eq!(normalize_version("1.2"), None);
    }

    #[test]
    fn system_installs_update_as_system_installs() {
        assert_eq!(
            update_command(Some(Path::new("/usr/local/bin/yambuck"))),
            "curl -sf https://yambuck.com/install.sh | bash -s -- --system"
        );
        assert_eq!(
            update_command(Some(Path::new("/home/user/.local/bin/yambuck"))),
            "curl -sf https://yambuck.com/install.sh | bash"
        );
    }

    #[test]
    fn update_script_fails_on_a_failed_download_and_relaunches() {
        let script = update_script(Some(Path::new("/home/user/.local/bin/yambuck")));
        assert!(script.starts_with("set -o pipefail\n"));
        assert!(script.contains("https://yambuck.com/install.sh"));
        assert!(script.contains("'/home/user/.local/bin/yambuck' --update-failed"));
    }
}
