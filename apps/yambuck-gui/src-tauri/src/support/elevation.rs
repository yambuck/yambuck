use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::support::logging::append_log;
use yambuck_core::{InstallScope, InstalledApp, PackageInfo};

const ELEVATED_INSTALL_MODE_ARG: &str = "--yambuck-elevated-install";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ElevatedInstallRequest {
    package_info: PackageInfo,
    destination_path: String,
    allow_downgrade: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ElevatedInstallResponse {
    success: bool,
    installed_app: Option<ElevatedInstalledApp>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ElevatedInstalledApp {
    app_id: String,
    display_name: String,
    version: String,
    install_scope: InstallScope,
    installed_at: String,
    icon_data_url: Option<String>,
}

pub(crate) fn maybe_run_elevated_install_mode(args: &[String]) -> Option<i32> {
    if args.len() == 4 && args[1] == ELEVATED_INSTALL_MODE_ARG {
        let request_path = &args[2];
        let response_path = &args[3];
        let exit_code = run_elevated_install_command(request_path, response_path);
        return Some(exit_code);
    }

    None
}

pub(crate) fn install_with_elevation_if_needed(
    package_info: &PackageInfo,
    destination_path: &str,
    allow_downgrade: bool,
) -> Result<InstalledApp, String> {
    if is_effectively_root() {
        let _ = append_log(
            "INFO",
            "System install running as root; skipping elevation prompt",
        );
        return yambuck_core::install_and_register(
            package_info,
            InstallScope::System,
            destination_path,
            allow_downgrade,
        )
        .map_err(|error| error.to_string());
    }

    let session_type = std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "unknown".to_string());
    let desktop = std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("DESKTOP_SESSION"))
        .unwrap_or_else(|_| "unknown".to_string());

    let _ = append_log(
        "INFO",
        &format!(
            "System install requested; elevation required (session={session_type}, desktop={desktop})"
        ),
    );

    run_pkexec_install(package_info, destination_path, allow_downgrade)
}

fn run_elevated_install_command(request_path: &str, response_path: &str) -> i32 {
    let request_content = match fs::read_to_string(request_path) {
        Ok(content) => content,
        Err(error) => {
            let _ = write_response(
                response_path,
                ElevatedInstallResponse {
                    success: false,
                    installed_app: None,
                    error: Some(format!("could not read elevation request: {error}")),
                },
            );
            return 2;
        }
    };

    let request: ElevatedInstallRequest = match serde_json::from_str(&request_content) {
        Ok(value) => value,
        Err(error) => {
            let _ = write_response(
                response_path,
                ElevatedInstallResponse {
                    success: false,
                    installed_app: None,
                    error: Some(format!("invalid elevation request payload: {error}")),
                },
            );
            return 2;
        }
    };

    let result = yambuck_core::install_and_register(
        &request.package_info,
        InstallScope::System,
        &request.destination_path,
        request.allow_downgrade,
    );

    let response = match result {
        Ok(installed_app) => ElevatedInstallResponse {
            success: true,
            installed_app: Some(ElevatedInstalledApp {
                app_id: installed_app.app_id,
                display_name: installed_app.display_name,
                version: installed_app.version,
                install_scope: installed_app.install_scope,
                installed_at: installed_app.installed_at,
                icon_data_url: installed_app.icon_data_url,
            }),
            error: None,
        },
        Err(error) => ElevatedInstallResponse {
            success: false,
            installed_app: None,
            error: Some(error.to_string()),
        },
    };

    if write_response(response_path, response).is_err() {
        return 3;
    }

    0
}

fn run_pkexec_install(
    package_info: &PackageInfo,
    destination_path: &str,
    allow_downgrade: bool,
) -> Result<InstalledApp, String> {
    if !has_pkexec() {
        let _ = append_log("ERROR", "Elevation failed: pkexec is not available");
        return Err(
            "All-users install requires administrator permission, but pkexec is not available on this system. Install policykit or use 'Just for me'.".to_string(),
        );
    }

    let request = ElevatedInstallRequest {
        package_info: package_info.clone(),
        destination_path: destination_path.to_string(),
        allow_downgrade,
    };

    let staging_dir = std::env::temp_dir().join(format!(
        "yambuck-elevated-install-{}-{}",
        std::process::id(),
        unique_suffix()
    ));
    fs::create_dir_all(&staging_dir)
        .map_err(|error| format!("Could not prepare elevation request directory: {error}"))?;

    let request_path = staging_dir.join("request.json");
    let response_path = staging_dir.join("response.json");

    let request_json = serde_json::to_string(&request)
        .map_err(|error| format!("Could not serialize elevation request: {error}"))?;
    fs::write(&request_path, request_json)
        .map_err(|error| format!("Could not write elevation request: {error}"))?;

    let current_exe = std::env::current_exe()
        .map_err(|error| format!("Could not resolve application executable path: {error}"))?;

    let _ = append_log("INFO", "Requesting elevation via pkexec for system install");
    let status = Command::new("pkexec")
        .arg(&current_exe)
        .arg(ELEVATED_INSTALL_MODE_ARG)
        .arg(&request_path)
        .arg(&response_path)
        .status()
        .map_err(|error| format!("Could not start elevation prompt: {error}"))?;

    let output = if response_path.exists() {
        Some(read_response(&response_path)?)
    } else {
        None
    };
    let _ = fs::remove_file(&request_path);
    let _ = fs::remove_file(&response_path);
    let _ = fs::remove_dir(&staging_dir);

    if status.success() {
        let output = output.ok_or_else(|| {
            "System install finished but produced no elevation response payload.".to_string()
        })?;
        if !output.success {
            let message = output.error.unwrap_or_else(|| {
                "System install failed after requesting administrator permissions.".to_string()
            });
            let _ = append_log(
                "ERROR",
                &format!("Elevated system install failed: {message}"),
            );
            return Err(message);
        }

        let _ = append_log("INFO", "System install completed with elevated permissions");
        return output
            .installed_app
            .map(|item| InstalledApp {
                app_id: item.app_id,
                display_name: item.display_name,
                version: item.version,
                install_scope: item.install_scope,
                installed_at: item.installed_at,
                icon_data_url: item.icon_data_url,
            })
            .ok_or_else(|| "System install finished but returned no install record.".to_string());
    }

    let message = if let Some(result) = output {
        result.error.unwrap_or_else(|| {
            "System install failed after requesting administrator permissions.".to_string()
        })
    } else if status.code() == Some(126) {
        "Administrator permissions were not granted. Install was cancelled.".to_string()
    } else if status.code() == Some(127) {
        "System policy denied elevation or no authentication agent is available.".to_string()
    } else {
        "System install failed after requesting administrator permissions.".to_string()
    };

    let _ = append_log(
        "ERROR",
        &format!("Elevated system install failed: {message}"),
    );
    Err(message)
}

fn has_pkexec() -> bool {
    Command::new("pkexec").arg("--version").output().is_ok()
}

fn read_response(path: &PathBuf) -> Result<ElevatedInstallResponse, String> {
    let response_content = fs::read_to_string(path)
        .map_err(|error| format!("Could not read elevation result: {error}"))?;
    serde_json::from_str(&response_content)
        .map_err(|error| format!("Could not parse elevation result: {error}"))
}

fn write_response(path: &str, response: ElevatedInstallResponse) -> Result<(), String> {
    let json = serde_json::to_string(&response).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

fn is_effectively_root() -> bool {
    Command::new("id")
        .arg("-u")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|value| value.trim() == "0")
        .unwrap_or(false)
}

fn unique_suffix() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{nanos}")
}
