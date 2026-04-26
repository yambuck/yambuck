use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::support::logging::append_log;
use yambuck_core::{InstallScope, InstalledApp, PackageInfo, UninstallResult};

const ELEVATED_INSTALL_MODE_ARG: &str = "--yambuck-elevated-install";
const ELEVATED_UNINSTALL_MODE_ARG: &str = "--yambuck-elevated-uninstall";

#[derive(Clone, Debug)]
struct ElevationRuntimeContext {
    session_type: String,
    desktop_environment: String,
    flatpak_sandboxed: bool,
    has_pkexec: bool,
    has_flatpak_spawn: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
enum ElevationStrategy {
    PkexecDirect,
    FlatpakHostPkexec,
}

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
    install_status: String,
    install_scope: InstallScope,
    installed_at: String,
    destination_path: String,
    icon_data_url: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ElevatedUninstallRequest {
    app_id: String,
    remove_user_data: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ElevatedUninstallResponse {
    success: bool,
    uninstall_result: Option<ElevatedUninstallResult>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ElevatedUninstallResult {
    app_id: String,
    install_scope: InstallScope,
    removed_app_files: bool,
    removed_user_data: bool,
    warnings: Vec<String>,
}

pub(crate) fn maybe_run_elevated_mode(args: &[String]) -> Option<i32> {
    if args.len() == 4 && args[1] == ELEVATED_INSTALL_MODE_ARG {
        let request_path = &args[2];
        let response_path = &args[3];
        let exit_code = run_elevated_install_command(request_path, response_path);
        return Some(exit_code);
    }

    if args.len() == 4 && args[1] == ELEVATED_UNINSTALL_MODE_ARG {
        let request_path = &args[2];
        let response_path = &args[3];
        let exit_code = run_elevated_uninstall_command(request_path, response_path);
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

    let context = ElevationRuntimeContext::collect();

    let _ = append_log(
        "INFO",
        &format!(
            "System install requested; elevation required (session={}, desktop={}, flatpakSandboxed={})",
            context.session_type, context.desktop_environment, context.flatpak_sandboxed
        ),
    );

    run_native_elevated_install(package_info, destination_path, allow_downgrade, &context)
}

pub(crate) fn uninstall_with_elevation_if_needed(
    app_id: &str,
    remove_user_data: bool,
) -> Result<UninstallResult, String> {
    if is_effectively_root() {
        let _ = append_log(
            "INFO",
            "System uninstall running as root; skipping elevation prompt",
        );
        return yambuck_core::uninstall_installed_app(
            app_id,
            InstallScope::System,
            remove_user_data,
        )
        .map_err(|error| error.to_string());
    }

    let context = ElevationRuntimeContext::collect();

    let _ = append_log(
        "INFO",
        &format!(
            "System uninstall requested; elevation required (session={}, desktop={}, flatpakSandboxed={})",
            context.session_type, context.desktop_environment, context.flatpak_sandboxed
        ),
    );

    run_native_elevated_uninstall(app_id, remove_user_data, &context)
}

fn run_elevated_install_command(request_path: &str, response_path: &str) -> i32 {
    let _ = append_log(
        "INFO",
        &format!(
            "Elevated install helper started requestPath={} responsePath={}",
            request_path, response_path
        ),
    );

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

    let _ = append_log(
        "INFO",
        &format!(
            "Elevated install helper finished core install appId={} success={}",
            request.package_info.app_id,
            result.is_ok()
        ),
    );

    let response = match result {
        Ok(installed_app) => ElevatedInstallResponse {
            success: true,
            installed_app: Some(ElevatedInstalledApp {
                app_id: installed_app.app_id,
                display_name: installed_app.display_name,
                version: installed_app.version,
                install_status: installed_app.install_status,
                install_scope: installed_app.install_scope,
                installed_at: installed_app.installed_at,
                destination_path: installed_app.destination_path,
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

fn run_elevated_uninstall_command(request_path: &str, response_path: &str) -> i32 {
    let _ = append_log(
        "INFO",
        &format!(
            "Elevated uninstall helper started requestPath={} responsePath={}",
            request_path, response_path
        ),
    );

    let request_content = match fs::read_to_string(request_path) {
        Ok(content) => content,
        Err(error) => {
            let _ = write_response(
                response_path,
                ElevatedUninstallResponse {
                    success: false,
                    uninstall_result: None,
                    error: Some(format!("could not read elevation request: {error}")),
                },
            );
            return 2;
        }
    };

    let request: ElevatedUninstallRequest = match serde_json::from_str(&request_content) {
        Ok(value) => value,
        Err(error) => {
            let _ = write_response(
                response_path,
                ElevatedUninstallResponse {
                    success: false,
                    uninstall_result: None,
                    error: Some(format!("invalid elevation request payload: {error}")),
                },
            );
            return 2;
        }
    };

    let result = yambuck_core::uninstall_installed_app(
        &request.app_id,
        InstallScope::System,
        request.remove_user_data,
    );

    let _ = append_log(
        "INFO",
        &format!(
            "Elevated uninstall helper finished core uninstall appId={} success={}",
            request.app_id,
            result.is_ok()
        ),
    );

    let response = match result {
        Ok(uninstall_result) => ElevatedUninstallResponse {
            success: true,
            uninstall_result: Some(ElevatedUninstallResult {
                app_id: uninstall_result.app_id,
                install_scope: uninstall_result.install_scope,
                removed_app_files: uninstall_result.removed_app_files,
                removed_user_data: uninstall_result.removed_user_data,
                warnings: uninstall_result.warnings,
            }),
            error: None,
        },
        Err(error) => ElevatedUninstallResponse {
            success: false,
            uninstall_result: None,
            error: Some(error.to_string()),
        },
    };

    if write_response(response_path, response).is_err() {
        return 3;
    }

    0
}

fn run_native_elevated_install(
    package_info: &PackageInfo,
    destination_path: &str,
    allow_downgrade: bool,
    context: &ElevationRuntimeContext,
) -> Result<InstalledApp, String> {
    let strategy = select_strategy(context).ok_or_else(|| {
        let _ = append_log(
            "ERROR",
            "Elevation failed: no supported native elevation strategy is available",
        );
        if context.flatpak_sandboxed {
            "All-users install requires administrator permission. No host elevation bridge was found in this Flatpak environment. Install policykit support or use 'Just for me'.".to_string()
        } else {
            "All-users install requires administrator permission, but no native policykit elevation path is available. Install policykit (pkexec) or use 'Just for me'.".to_string()
        }
    })?;

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

    let _ = append_log(
        "INFO",
        &format!(
            "Requesting elevation using strategy={} (session={}, desktop={})",
            strategy.label(),
            context.session_type,
            context.desktop_environment,
        ),
    );
    let status = run_elevation_command(
        &strategy,
        &current_exe,
        ELEVATED_INSTALL_MODE_ARG,
        &request_path,
        &response_path,
        context,
    )?;

    let _ = append_log(
        "INFO",
        &format!(
            "Elevation install command returned success={} code={} responsePathExists={}",
            status.success(),
            status.code().map_or_else(|| "none".to_string(), |code| code.to_string()),
            response_path.exists(),
        ),
    );

    let output = if response_path.exists() {
        Some(read_response::<ElevatedInstallResponse>(&response_path)?)
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
                install_status: item.install_status,
                install_scope: item.install_scope,
                installed_at: item.installed_at,
                destination_path: item.destination_path,
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
        format!(
            "System policy denied elevation or no authentication agent is available (strategy={}, session={}).",
            strategy.label(),
            context.session_type,
        )
    } else {
        format!(
            "System install failed after requesting administrator permissions (strategy={}, session={}).",
            strategy.label(),
            context.session_type,
        )
    };

    let _ = append_log(
        "ERROR",
        &format!("Elevated system install failed: {message}"),
    );
    Err(message)
}

fn run_native_elevated_uninstall(
    app_id: &str,
    remove_user_data: bool,
    context: &ElevationRuntimeContext,
) -> Result<UninstallResult, String> {
    let strategy = select_strategy(context).ok_or_else(|| {
        let _ = append_log(
            "ERROR",
            "Elevation failed: no supported native elevation strategy is available",
        );
        if context.flatpak_sandboxed {
            "All-users uninstall requires administrator permission. No host elevation bridge was found in this Flatpak environment.".to_string()
        } else {
            "All-users uninstall requires administrator permission, but no native policykit elevation path is available. Install policykit (pkexec).".to_string()
        }
    })?;

    let request = ElevatedUninstallRequest {
        app_id: app_id.to_string(),
        remove_user_data,
    };

    let staging_dir = std::env::temp_dir().join(format!(
        "yambuck-elevated-uninstall-{}-{}",
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

    let _ = append_log(
        "INFO",
        &format!(
            "Requesting elevation for uninstall using strategy={} (session={}, desktop={})",
            strategy.label(),
            context.session_type,
            context.desktop_environment,
        ),
    );
    let status = run_elevation_command(
        &strategy,
        &current_exe,
        ELEVATED_UNINSTALL_MODE_ARG,
        &request_path,
        &response_path,
        context,
    )?;

    let _ = append_log(
        "INFO",
        &format!(
            "Elevation uninstall command returned success={} code={} responsePathExists={}",
            status.success(),
            status.code().map_or_else(|| "none".to_string(), |code| code.to_string()),
            response_path.exists(),
        ),
    );

    let output = if response_path.exists() {
        Some(read_response::<ElevatedUninstallResponse>(&response_path)?)
    } else {
        None
    };
    let _ = fs::remove_file(&request_path);
    let _ = fs::remove_file(&response_path);
    let _ = fs::remove_dir(&staging_dir);

    if status.success() {
        let output = output.ok_or_else(|| {
            "System uninstall finished but produced no elevation response payload.".to_string()
        })?;
        if !output.success {
            let message = output.error.unwrap_or_else(|| {
                "System uninstall failed after requesting administrator permissions.".to_string()
            });
            let _ = append_log(
                "ERROR",
                &format!("Elevated system uninstall failed: {message}"),
            );
            return Err(message);
        }

        let _ = append_log(
            "INFO",
            "System uninstall completed with elevated permissions",
        );
        return output
            .uninstall_result
            .map(|item| UninstallResult {
                app_id: item.app_id,
                install_scope: item.install_scope,
                removed_app_files: item.removed_app_files,
                removed_user_data: item.removed_user_data,
                warnings: item.warnings,
            })
            .ok_or_else(|| {
                "System uninstall finished but returned no uninstall result.".to_string()
            });
    }

    let message = if let Some(result) = output {
        result.error.unwrap_or_else(|| {
            "System uninstall failed after requesting administrator permissions.".to_string()
        })
    } else if status.code() == Some(126) {
        "Administrator permissions were not granted. Uninstall was cancelled.".to_string()
    } else if status.code() == Some(127) {
        format!(
            "System policy denied elevation or no authentication agent is available (strategy={}, session={}).",
            strategy.label(),
            context.session_type,
        )
    } else {
        format!(
            "System uninstall failed after requesting administrator permissions (strategy={}, session={}).",
            strategy.label(),
            context.session_type,
        )
    };

    let _ = append_log(
        "ERROR",
        &format!("Elevated system uninstall failed: {message}"),
    );
    Err(message)
}

fn run_elevation_command(
    strategy: &ElevationStrategy,
    current_exe: &PathBuf,
    mode_arg: &str,
    request_path: &PathBuf,
    response_path: &PathBuf,
    context: &ElevationRuntimeContext,
) -> Result<std::process::ExitStatus, String> {
    let mut command = match strategy {
        ElevationStrategy::PkexecDirect => {
            let mut command = Command::new("pkexec");
            command
                .arg(current_exe)
                .arg(mode_arg)
                .arg(request_path)
                .arg(response_path);
            command
        }
        ElevationStrategy::FlatpakHostPkexec => {
            let mut command = Command::new("flatpak-spawn");
            command
                .arg("--host")
                .arg("pkexec")
                .arg(current_exe)
                .arg(mode_arg)
                .arg(request_path)
                .arg(response_path);
            command
        }
    };

    let _ = append_log(
        "INFO",
        &format!(
            "Launching elevation command strategy={} modeArg={} exe={} requestPath={} responsePath={} session={} desktop={}",
            strategy.label(),
            mode_arg,
            current_exe.display(),
            request_path.display(),
            response_path.display(),
            context.session_type,
            context.desktop_environment,
        ),
    );

    let status = command
        .status()
        .map_err(|error| format!("Could not start elevation prompt: {error}"))?;

    let _ = append_log(
        "INFO",
        &format!(
            "Elevation command finished strategy={} modeArg={} success={} code={}",
            strategy.label(),
            mode_arg,
            status.success(),
            status.code().map_or_else(|| "none".to_string(), |code| code.to_string()),
        ),
    );

    Ok(status)
}

fn select_strategy(context: &ElevationRuntimeContext) -> Option<ElevationStrategy> {
    if context.flatpak_sandboxed && context.has_flatpak_spawn && context.has_pkexec {
        return Some(ElevationStrategy::FlatpakHostPkexec);
    }

    if context.has_pkexec {
        return Some(ElevationStrategy::PkexecDirect);
    }

    None
}

fn has_command(command_name: &str, probe_arg: &str) -> bool {
    Command::new(command_name).arg(probe_arg).output().is_ok()
}

fn read_response<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<T, String> {
    let response_content = fs::read_to_string(path)
        .map_err(|error| format!("Could not read elevation result: {error}"))?;
    serde_json::from_str(&response_content)
        .map_err(|error| format!("Could not parse elevation result: {error}"))
}

fn write_response<T: Serialize>(path: &str, response: T) -> Result<(), String> {
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

impl ElevationStrategy {
    fn label(&self) -> &'static str {
        match self {
            ElevationStrategy::PkexecDirect => "pkexec-direct",
            ElevationStrategy::FlatpakHostPkexec => "flatpak-host-pkexec",
        }
    }
}

impl ElevationRuntimeContext {
    fn collect() -> Self {
        let session_type =
            std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "unknown".to_string());
        let desktop_environment = std::env::var("XDG_CURRENT_DESKTOP")
            .or_else(|_| std::env::var("DESKTOP_SESSION"))
            .unwrap_or_else(|_| "unknown".to_string());
        let flatpak_sandboxed =
            std::env::var("FLATPAK_ID").is_ok() || std::path::Path::new("/.flatpak-info").exists();

        Self {
            session_type,
            desktop_environment,
            flatpak_sandboxed,
            has_pkexec: has_command("pkexec", "--version"),
            has_flatpak_spawn: has_command("flatpak-spawn", "--help"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{select_strategy, ElevationRuntimeContext, ElevationStrategy};

    fn context_for(
        session_type: &str,
        flatpak: bool,
        has_pkexec: bool,
        has_flatpak_spawn: bool,
    ) -> ElevationRuntimeContext {
        ElevationRuntimeContext {
            session_type: session_type.to_string(),
            desktop_environment: "test-desktop".to_string(),
            flatpak_sandboxed: flatpak,
            has_pkexec,
            has_flatpak_spawn,
        }
    }

    #[test]
    fn chooses_pkexec_for_wayland_when_available() {
        let context = context_for("wayland", false, true, false);
        assert_eq!(
            select_strategy(&context),
            Some(ElevationStrategy::PkexecDirect)
        );
    }

    #[test]
    fn chooses_pkexec_for_x11_when_available() {
        let context = context_for("x11", false, true, false);
        assert_eq!(
            select_strategy(&context),
            Some(ElevationStrategy::PkexecDirect)
        );
    }

    #[test]
    fn chooses_flatpak_host_bridge_when_sandboxed() {
        let context = context_for("wayland", true, true, true);
        assert_eq!(
            select_strategy(&context),
            Some(ElevationStrategy::FlatpakHostPkexec)
        );
    }

    #[test]
    fn returns_none_when_no_native_elevation_available() {
        let context = context_for("wayland", false, false, false);
        assert_eq!(select_strategy(&context), None);
    }
}
