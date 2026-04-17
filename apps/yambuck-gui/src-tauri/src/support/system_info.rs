use serde::Serialize;
use std::process::Command;

use crate::DEFAULT_UPDATE_FEED_URL;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub app_version: String,
    pub os: String,
    pub arch: String,
    pub kernel_version: String,
    pub distro: String,
    pub desktop_environment: String,
    pub session_type: String,
    pub install_path: String,
    pub update_feed_url: String,
}

pub fn get_system_info() -> Result<SystemInfo, String> {
    let current_exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let distro =
        read_os_release_value("PRETTY_NAME").unwrap_or_else(|| "Unknown distro".to_string());
    let desktop_environment = std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("DESKTOP_SESSION"))
        .unwrap_or_else(|_| "Unknown desktop".to_string());
    let session_type =
        std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "Unknown session".to_string());

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

fn read_os_release_value(key: &str) -> Option<String> {
    let content = std::fs::read_to_string("/etc/os-release").ok()?;
    for line in content.lines() {
        if let Some((left, right)) = line.split_once('=') {
            if left == key {
                return Some(right.trim_matches('"').to_string());
            }
        }
    }
    None
}
