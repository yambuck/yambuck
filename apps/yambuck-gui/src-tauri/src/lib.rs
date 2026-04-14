use flate2::read::GzDecoder;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Cursor;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use yambuck_core::{InstallPreview, InstalledApp, InstallerContext, PackageInfo, UpdateCheckResult};

const DEFAULT_UPDATE_FEED_URL: &str = "https://yambuck.com/updates/stable.json";

#[tauri::command]
fn get_installer_context() -> InstallerContext {
    yambuck_core::installer_context(env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
fn inspect_package(package_file: &str) -> Result<PackageInfo, String> {
    yambuck_core::inspect_package(package_file).map_err(|error| error.to_string())
}

#[tauri::command]
fn create_install_preview(
    package_file: &str,
    app_id: &str,
    scope: &str,
    verified_publisher: bool,
) -> Result<InstallPreview, String> {
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::create_install_preview(package_file, app_id, install_scope, verified_publisher)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn list_installed_apps() -> Vec<InstalledApp> {
    yambuck_core::list_installed_apps()
}

#[tauri::command]
fn uninstall_installed_app(app_id: &str, remove_user_data: bool) -> Result<(), String> {
    yambuck_core::uninstall_installed_app(app_id, remove_user_data)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn complete_install(
    package_info: PackageInfo,
    scope: &str,
    destination_path: &str,
) -> Result<InstalledApp, String> {
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::register_install(&package_info, install_scope, destination_path)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn check_for_updates(feed_url: Option<String>) -> Result<UpdateCheckResult, String> {
    let url = feed_url.unwrap_or_else(|| DEFAULT_UPDATE_FEED_URL.to_string());
    let response = reqwest::get(url)
        .await
        .map_err(|error| format!("failed to fetch update feed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "update feed request failed with status {}",
            response.status()
        ));
    }

    let feed_json = response
        .text()
        .await
        .map_err(|error| format!("failed to read update feed response: {error}"))?;

    yambuck_core::evaluate_update_feed(&feed_json, env!("CARGO_PKG_VERSION"), std::env::consts::ARCH)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn apply_update_and_restart(download_url: String, expected_sha256: String) -> Result<(), String> {
    if download_url.trim().is_empty() {
        return Err("missing download URL".to_string());
    }
    if expected_sha256.trim().is_empty() || expected_sha256 == "unpublished" {
        return Err("missing valid checksum for update".to_string());
    }

    let current_exe = std::env::current_exe().map_err(|error| error.to_string())?;
    ensure_user_install_path(&current_exe)?;

    let response = reqwest::get(&download_url)
        .await
        .map_err(|error| format!("failed to download update: {error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "update download failed with status {}",
            response.status()
        ));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read update payload: {error}"))?;

    let actual_sha256 = sha256_hex(&bytes);
    if actual_sha256 != expected_sha256.to_lowercase() {
        return Err("update checksum verification failed".to_string());
    }

    let temp_root = std::env::temp_dir().join(format!(
        "yambuck-update-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_secs()
    ));
    fs::create_dir_all(&temp_root).map_err(|error| error.to_string())?;

    let extract_dir = temp_root.join("extract");
    fs::create_dir_all(&extract_dir).map_err(|error| error.to_string())?;

    let archive_reader = Cursor::new(bytes);
    let gzip_decoder = GzDecoder::new(archive_reader);
    let mut archive = tar::Archive::new(gzip_decoder);
    archive
        .unpack(&extract_dir)
        .map_err(|error| format!("failed to extract update: {error}"))?;

    let extracted_bin = find_update_binary(&extract_dir)?;
    let staged_bin = temp_root.join("yambuck-new");
    fs::copy(&extracted_bin, &staged_bin).map_err(|error| error.to_string())?;
    fs::set_permissions(&staged_bin, fs::Permissions::from_mode(0o755))
        .map_err(|error| error.to_string())?;

    let script_path = temp_root.join("apply-update.sh");
    let script_content = format!(
        "#!/usr/bin/env bash\nset -euo pipefail\nsleep 1\ninstall -m 0755 \"{}\" \"{}\"\n\"{}\" >/dev/null 2>&1 &\n",
        staged_bin.display(),
        current_exe.display(),
        current_exe.display()
    );
    fs::write(&script_path, script_content).map_err(|error| error.to_string())?;
    fs::set_permissions(&script_path, fs::Permissions::from_mode(0o755))
        .map_err(|error| error.to_string())?;

    Command::new("sh")
        .arg(script_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("failed to schedule update apply: {error}"))?;

    Ok(())
}

fn ensure_user_install_path(current_exe: &Path) -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let user_bin = PathBuf::from(home).join(".local").join("bin");
    if current_exe.starts_with(&user_bin) {
        Ok(())
    } else {
        Err("In-app update currently supports user installs only. Use website installer for system installs.".to_string())
    }
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    format!("{digest:x}")
}

fn find_update_binary(extract_dir: &Path) -> Result<PathBuf, String> {
    let direct = extract_dir.join("yambuck");
    if direct.exists() {
        return Ok(direct);
    }

    let nested = extract_dir.join("bin").join("yambuck");
    if nested.exists() {
        return Ok(nested);
    }

    for entry in fs::read_dir(extract_dir).map_err(|error| error.to_string())? {
        let path = entry.map_err(|error| error.to_string())?.path();
        if path.is_file() && path.file_name().and_then(|s| s.to_str()) == Some("yambuck") {
            return Ok(path);
        }
        if path.is_dir() {
            let maybe = path.join("bin").join("yambuck");
            if maybe.exists() {
                return Ok(maybe);
            }
        }
    }

    Err("update payload does not contain yambuck binary".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_installer_context,
            inspect_package,
            create_install_preview,
            check_for_updates,
            apply_update_and_restart,
            list_installed_apps,
            uninstall_installed_app,
            complete_install
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
