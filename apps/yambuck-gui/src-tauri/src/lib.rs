use flate2::read::GzDecoder;
use chrono::{Local, SecondsFormat};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs::{self, OpenOptions};
use std::io::Cursor;
use std::io::Write;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use yambuck_core::{
    InstallPreview, InstalledApp, InstallerContext, PackageInfo, PreflightCheckResult,
    UpdateCheckResult,
};

const DEFAULT_UPDATE_FEED_URL: &str = "https://yambuck.com/updates/stable.json";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemInfo {
    app_version: String,
    os: String,
    arch: String,
    kernel_version: String,
    distro: String,
    desktop_environment: String,
    session_type: String,
    install_path: String,
    update_feed_url: String,
}

#[tauri::command]
fn get_installer_context() -> InstallerContext {
    let _ = append_log("INFO", "Loaded installer context");
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
fn preflight_install_check(app_id: &str) -> Result<PreflightCheckResult, String> {
    yambuck_core::preflight_install_check(app_id).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_startup_package_arg() -> Option<String> {
    let arg = std::env::args().skip(1).find(|value| value.ends_with(".yambuck") || value.starts_with("file://"))?;
    normalize_package_arg(&arg)
}

#[tauri::command]
async fn check_for_updates(feed_url: Option<String>) -> Result<UpdateCheckResult, String> {
    let url = feed_url.unwrap_or_else(|| DEFAULT_UPDATE_FEED_URL.to_string());
    let _ = append_log("INFO", &format!("Checking updates from {url}"));
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

    let result = yambuck_core::evaluate_update_feed(
        &feed_json,
        env!("CARGO_PKG_VERSION"),
        std::env::consts::ARCH,
    )
    .map_err(|error| error.to_string())?;

    if result.update_available {
        let _ = append_log(
            "INFO",
            &format!(
                "Update available: {} -> {}",
                result.current_version, result.latest_version
            ),
        );
    } else {
        let _ = append_log("INFO", "No update available");
    }

    Ok(result)
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
    let _ = append_log("INFO", "Starting in-app update apply flow");

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
        let _ = append_log("ERROR", "Update checksum verification failed");
        return Err("update checksum verification failed".to_string());
    }
    let _ = append_log("INFO", "Update checksum verified");

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

    let _ = append_log("INFO", "Update scheduled, app will restart");

    Ok(())
}

#[tauri::command]
fn get_system_info() -> Result<SystemInfo, String> {
    let current_exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let distro = read_os_release_value("PRETTY_NAME").unwrap_or_else(|| "Unknown distro".to_string());
    let desktop_environment = std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("DESKTOP_SESSION"))
        .unwrap_or_else(|_| "Unknown desktop".to_string());
    let session_type = std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "Unknown session".to_string());

    let kernel_version = Command::new("uname")
        .arg("-r")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .unwrap_or_else(|| "Unknown kernel".to_string());

    Ok(SystemInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        kernel_version,
        distro,
        desktop_environment,
        session_type,
        install_path: current_exe.display().to_string(),
        update_feed_url: DEFAULT_UPDATE_FEED_URL.to_string(),
    })
}

#[tauri::command]
fn get_recent_logs(limit: Option<usize>) -> Result<String, String> {
    let path = log_file_path()?;
    if !path.exists() {
        return Ok(String::new());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let max_lines = limit.unwrap_or(250);
    if max_lines == 0 {
        return Ok(String::new());
    }

    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(max_lines);
    Ok(lines[start..].join("\n"))
}

#[tauri::command]
fn clear_logs() -> Result<(), String> {
    let path = log_file_path()?;
    let parent = path.parent().ok_or_else(|| "invalid log path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    fs::write(path, "").map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn log_ui_event(level: Option<String>, message: String) -> Result<(), String> {
    let normalized = level.unwrap_or_else(|| "INFO".to_string());
    append_log(&normalized, &message)
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

fn append_log(level: &str, message: &str) -> Result<(), String> {
    let path = log_file_path()?;
    let parent = path.parent().ok_or_else(|| "invalid log path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| error.to_string())?;

    let timestamp = iso_like_timestamp();
    let line = format!("[{timestamp}] [{}] {}\n", normalize_level(level), message);
    file.write_all(line.as_bytes()).map_err(|error| error.to_string())
}

fn normalize_package_arg(raw: &str) -> Option<String> {
    let mut value = raw.to_string();
    if let Some(stripped) = value.strip_prefix("file://") {
        value = stripped.to_string();
    }
    value = percent_decode(&value);
    if value.ends_with(".yambuck") {
        Some(value)
    } else {
        None
    }
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = String::with_capacity(input.len());
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            let hex = &input[index + 1..index + 3];
            if let Ok(value) = u8::from_str_radix(hex, 16) {
                out.push(value as char);
                index += 3;
                continue;
            }
        }
        out.push(bytes[index] as char);
        index += 1;
    }
    out
}

fn normalize_level(level: &str) -> &str {
    match level.to_ascii_uppercase().as_str() {
        "DEBUG" => "DEBUG",
        "WARN" | "WARNING" => "WARN",
        "ERROR" => "ERROR",
        "INFO" => "INFO",
        _ => "INFO",
    }
}

fn log_file_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    Ok(PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("yambuck")
        .join("logs")
        .join("current.log"))
}

fn read_os_release_value(key: &str) -> Option<String> {
    let content = fs::read_to_string("/etc/os-release").ok()?;
    for line in content.lines() {
        if let Some((left, right)) = line.split_once('=') {
            if left == key {
                return Some(right.trim_matches('"').to_string());
            }
        }
    }
    None
}

fn iso_like_timestamp() -> String {
    Local::now().to_rfc3339_opts(SecondsFormat::Millis, false)
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
            get_system_info,
            get_recent_logs,
            clear_logs,
            log_ui_event,
            preflight_install_check,
            get_startup_package_arg,
            list_installed_apps,
            uninstall_installed_app,
            complete_install
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
