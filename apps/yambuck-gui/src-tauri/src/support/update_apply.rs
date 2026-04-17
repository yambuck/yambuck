use flate2::read::GzDecoder;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Cursor;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use crate::support::logging::{append_log, update_helper_log_path};

pub async fn apply_update_and_restart(
    download_url: String,
    expected_sha256: String,
) -> Result<(), String> {
    if download_url.trim().is_empty() {
        return Err("missing download URL".to_string());
    }
    if expected_sha256.trim().is_empty() || expected_sha256 == "unpublished" {
        return Err("missing valid checksum for update".to_string());
    }

    let current_exe = std::env::current_exe().map_err(|error| error.to_string())?;
    ensure_user_install_path(&current_exe)?;
    let _ = append_log("INFO", "Starting in-app update apply flow");

    let expected_sha256 = expected_sha256.trim().to_ascii_lowercase();

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
    if actual_sha256 != expected_sha256 {
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

    let helper_log = update_helper_log_path()?;
    if let Some(parent) = helper_log.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let script_path = temp_root.join("apply-update.sh");
    let script_content = r#"#!/bin/sh
set -eu

PARENT_PID="$1"
STAGED_BIN="$2"
TARGET_BIN="$3"
HELPER_LOG="$4"

{
  echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] [INFO] Update helper started"

  wait_secs=0
  while kill -0 "$PARENT_PID" 2>/dev/null; do
    if [ "$wait_secs" -ge 25 ]; then
      echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] [ERROR] Timed out waiting for parent process to exit"
      exit 1
    fi
    sleep 1
    wait_secs=$((wait_secs + 1))
  done

  tmp_target="${TARGET_BIN}.next"
  install -m 0755 "$STAGED_BIN" "$tmp_target"
  mv -f "$tmp_target" "$TARGET_BIN"

  if [ ! -x "$TARGET_BIN" ]; then
    echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] [ERROR] Updated binary is not executable"
    exit 1
  fi

  "$TARGET_BIN" >/dev/null 2>&1 &
  echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] [INFO] Update helper completed and relaunched app"
} >>"$HELPER_LOG" 2>&1
"#;
    fs::write(&script_path, script_content).map_err(|error| error.to_string())?;
    fs::set_permissions(&script_path, fs::Permissions::from_mode(0o755))
        .map_err(|error| error.to_string())?;

    Command::new("sh")
        .arg(&script_path)
        .arg(std::process::id().to_string())
        .arg(&staged_bin)
        .arg(&current_exe)
        .arg(&helper_log)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("failed to schedule update apply: {error}"))?;

    let _ = append_log(
        "INFO",
        &format!(
            "Update scheduled, app will restart (helper log: {})",
            helper_log.display()
        ),
    );

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
