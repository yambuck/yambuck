use serde::Serialize;
use tauri::{Emitter, Manager};
use yambuck_core::{
    InstallPreview, InstalledApp, InstalledAppDetails, InstallerContext, PackageInfo,
    PreflightCheckResult, UninstallResult, UpdateCheckResult,
};

mod commands;
mod support;

pub(crate) const DEFAULT_UPDATE_FEED_URL: &str = "https://yambuck.com/updates/stable.json";
const OPEN_PACKAGE_EVENT: &str = "yambuck://open-package";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenPackageEventPayload {
    package_file: String,
}

pub(crate) fn get_installer_context_impl() -> InstallerContext {
    let _ = support::logging::append_log("INFO", "Loaded installer context");
    yambuck_core::installer_context(env!("CARGO_PKG_VERSION"))
}

pub(crate) fn inspect_package_impl(package_file: &str) -> Result<PackageInfo, String> {
    yambuck_core::inspect_package(package_file).map_err(|error| error.to_string())
}

pub(crate) fn create_install_preview_impl(
    package_file: &str,
    app_id: &str,
    scope: &str,
    verified_publisher: bool,
) -> Result<InstallPreview, String> {
    let install_scope = yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::create_install_preview(package_file, app_id, install_scope, verified_publisher)
        .map_err(|error| error.to_string())
}

pub(crate) fn list_installed_apps_impl() -> Vec<InstalledApp> {
    yambuck_core::list_installed_apps()
}

pub(crate) fn get_installed_app_details_impl(app_id: &str) -> Result<InstalledAppDetails, String> {
    yambuck_core::get_installed_app_details(app_id).map_err(|error| error.to_string())
}

pub(crate) fn uninstall_installed_app_impl(
    app_id: &str,
    scope: &str,
    remove_user_data: bool,
) -> Result<UninstallResult, String> {
    let install_scope = yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::uninstall_installed_app(app_id, install_scope, remove_user_data)
        .map_err(|error| error.to_string())
}

pub(crate) fn complete_install_impl(
    package_info: PackageInfo,
    scope: &str,
    destination_path: &str,
) -> Result<InstalledApp, String> {
    let install_scope = yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::install_and_register(&package_info, install_scope, destination_path)
        .map_err(|error| error.to_string())
}

pub(crate) fn launch_installed_app_impl(app_id: &str) -> Result<(), String> {
    yambuck_core::launch_installed_app(app_id).map_err(|error| error.to_string())
}

pub(crate) fn preflight_install_check_impl(app_id: &str) -> Result<PreflightCheckResult, String> {
    yambuck_core::preflight_install_check(app_id).map_err(|error| error.to_string())
}

pub(crate) fn get_startup_package_arg_impl() -> Option<String> {
    let args = std::env::args().collect::<Vec<String>>();
    support::launch_args::package_arg_from_launch_args(&args)
}

pub(crate) async fn check_for_updates_impl(feed_url: Option<String>) -> Result<UpdateCheckResult, String> {
    let url = feed_url.unwrap_or_else(|| DEFAULT_UPDATE_FEED_URL.to_string());
    let _ = support::logging::append_log("INFO", &format!("Checking updates from {url}"));
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
        let _ = support::logging::append_log(
            "INFO",
            &format!(
                "Update available: {} -> {}",
                result.current_version, result.latest_version
            ),
        );
    } else {
        let _ = support::logging::append_log("INFO", "No update available");
    }

    Ok(result)
}

pub(crate) async fn apply_update_and_restart_impl(
    download_url: String,
    expected_sha256: String,
) -> Result<(), String> {
    support::update_apply::apply_update_and_restart(download_url, expected_sha256).await
}

pub(crate) fn get_system_info_impl() -> Result<support::system_info::SystemInfo, String> {
    support::system_info::get_system_info()
}

pub(crate) fn get_recent_logs_impl(limit: Option<usize>) -> Result<String, String> {
    support::logging::get_recent_logs(limit)
}

pub(crate) fn clear_logs_impl() -> Result<(), String> {
    support::logging::clear_logs()
}

pub(crate) fn log_ui_event_impl(level: Option<String>, message: String) -> Result<(), String> {
    let normalized = level.unwrap_or_else(|| "INFO".to_string());
    support::logging::append_log(&normalized, &message)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            if let Some(package_file) = support::launch_args::package_arg_from_launch_args(&argv) {
                let payload = OpenPackageEventPayload { package_file };
                let _ = app.emit(OPEN_PACKAGE_EVENT, payload);
            }
        }))
        .invoke_handler(tauri::generate_handler![
            commands::installer::get_installer_context,
            commands::installer::inspect_package,
            commands::installer::create_install_preview,
            commands::update::check_for_updates,
            commands::update::apply_update_and_restart,
            commands::system::get_system_info,
            commands::logs::get_recent_logs,
            commands::logs::clear_logs,
            commands::logs::log_ui_event,
            commands::installer::preflight_install_check,
            commands::installer::get_startup_package_arg,
            commands::installer::list_installed_apps,
            commands::installer::get_installed_app_details,
            commands::installer::uninstall_installed_app,
            commands::installer::complete_install,
            commands::installer::launch_installed_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
