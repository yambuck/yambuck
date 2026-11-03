//! What a bug report needs about this machine (App Standard sections 3-4):
//! written as the session log header and shown in Settings -> Debug.

use serde::Serialize;
use std::process::Command;

use crate::commands::update::GITHUB_LATEST_RELEASE_API_URL;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub app_name: String,
    pub app_version: String,
    pub build_profile: String,
    pub executable: String,
    pub os: String,
    pub distribution: String,
    pub kernel_version: String,
    pub architecture: String,
    pub desktop: String,
    pub session_type: String,
    pub update_check_url: String,
}

impl SystemInfo {
    pub fn collect() -> Self {
        Self {
            app_name: "Yambuck".to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            // A dev build and an installed release can share a version.
            build_profile: if cfg!(debug_assertions) {
                "debug"
            } else {
                "release"
            }
            .to_string(),
            executable: std::env::current_exe()
                .map(|path| path.display().to_string())
                .unwrap_or_else(|error| format!("unknown ({error})")),
            os: std::env::consts::OS.to_string(),
            distribution: read_os_release_value("PRETTY_NAME")
                .unwrap_or_else(|| "unknown".to_string()),
            kernel_version: kernel_version(),
            architecture: std::env::consts::ARCH.to_string(),
            desktop: std::env::var("XDG_CURRENT_DESKTOP")
                .or_else(|_| std::env::var("DESKTOP_SESSION"))
                .ok()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "unknown".to_string()),
            session_type: session_type(),
            update_check_url: GITHUB_LATEST_RELEASE_API_URL.to_string(),
        }
    }

    /// One `key=value` line per field, for the log header and the copy button.
    pub fn summary(&self) -> String {
        format!(
            "app={} {}\nbuild={}\nexecutable={}\nos={}\ndistribution={}\nkernel={}\narchitecture={}\ndesktop={}\nsession_type={}\nupdate_check={}",
            self.app_name,
            self.app_version,
            self.build_profile,
            self.executable,
            self.os,
            self.distribution,
            self.kernel_version,
            self.architecture,
            self.desktop,
            self.session_type,
            self.update_check_url,
        )
    }
}

/// Wayland or X11, from the session's environment.
fn session_type() -> String {
    if let Ok(session_type) = std::env::var("XDG_SESSION_TYPE") {
        if !session_type.trim().is_empty() {
            return session_type;
        }
    }
    if std::env::var_os("WAYLAND_DISPLAY").is_some() {
        "wayland".to_string()
    } else if std::env::var_os("DISPLAY").is_some() {
        "x11".to_string()
    } else {
        "unknown".to_string()
    }
}

fn kernel_version() -> String {
    Command::new("uname")
        .arg("-r")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .unwrap_or_else(|| "unknown".to_string())
}

fn read_os_release_value(key: &str) -> Option<String> {
    let content = std::fs::read_to_string("/etc/os-release").ok()?;
    content.lines().find_map(|line| {
        let (left, right) = line.split_once('=')?;
        (left == key).then(|| right.trim_matches('"').to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::SystemInfo;

    #[test]
    fn summary_names_every_field() {
        let summary = SystemInfo::collect().summary();
        for key in [
            "app=Yambuck ",
            "build=",
            "executable=",
            "os=",
            "distribution=",
            "kernel=",
            "architecture=",
            "desktop=",
            "session_type=",
            "update_check=",
        ] {
            assert!(summary.contains(key), "missing {key} in {summary}");
        }
    }
}
