use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};
use yambuck_core::{
    InstallDecision, InstallOptionSubmission, InstallPreview, InstallWorkflow, InstalledApp,
    InstalledAppDetails, InstallerContext, PackageInfo, PreflightCheckResult, UninstallResult,
    UpdateCheckResult,
};

mod commands;
mod support;

pub(crate) const DEFAULT_UPDATE_FEED_URL: &str = "https://yambuck.com/updates/stable.json";
const OPEN_PACKAGE_EVENT: &str = "yambuck://open-package";
static WORKFLOW_COUNTER: AtomicU64 = AtomicU64::new(1);
static INSTALL_WORKFLOW_SESSIONS: LazyLock<Mutex<HashMap<String, WorkflowSessionEntry>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
const WORKFLOW_SESSION_TTL: Duration = Duration::from_secs(30 * 60);

#[derive(Clone)]
struct WorkflowSessionEntry {
    workflow: InstallWorkflow,
    last_touched: Instant,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenPackageEventPayload {
    package_file: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallWorkflowSession {
    workflow_id: String,
    workflow: InstallWorkflow,
}

fn next_workflow_id() -> String {
    let next = WORKFLOW_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("workflow-{next}")
}

fn purge_expired_workflow_sessions(sessions: &mut HashMap<String, WorkflowSessionEntry>) {
    let now = Instant::now();
    sessions.retain(|_, entry| now.duration_since(entry.last_touched) < WORKFLOW_SESSION_TTL);
}

fn store_workflow_session(workflow: InstallWorkflow) -> Result<InstallWorkflowSession, String> {
    let workflow_id = next_workflow_id();
    let mut sessions = INSTALL_WORKFLOW_SESSIONS
        .lock()
        .map_err(|_| "failed to lock workflow session store".to_string())?;
    purge_expired_workflow_sessions(&mut sessions);
    sessions.insert(
        workflow_id.clone(),
        WorkflowSessionEntry {
            workflow: workflow.clone(),
            last_touched: Instant::now(),
        },
    );
    Ok(InstallWorkflowSession {
        workflow_id,
        workflow,
    })
}

fn get_workflow_from_session(workflow_id: &str) -> Result<InstallWorkflow, String> {
    let mut sessions = INSTALL_WORKFLOW_SESSIONS
        .lock()
        .map_err(|_| "failed to lock workflow session store".to_string())?;
    purge_expired_workflow_sessions(&mut sessions);
    sessions
        .get_mut(workflow_id)
        .map(|entry| {
            entry.last_touched = Instant::now();
            entry.workflow.clone()
        })
        .ok_or_else(|| format!("install workflow session not found: {workflow_id}"))
}

fn remove_workflow_session(workflow_id: &str) -> Result<(), String> {
    let mut sessions = INSTALL_WORKFLOW_SESSIONS
        .lock()
        .map_err(|_| "failed to lock workflow session store".to_string())?;
    purge_expired_workflow_sessions(&mut sessions);
    sessions.remove(workflow_id);
    Ok(())
}

pub(crate) fn discard_install_workflow_impl(workflow_id: &str) -> Result<(), String> {
    remove_workflow_session(workflow_id)
}

pub(crate) fn get_installer_context_impl() -> InstallerContext {
    let _ = support::logging::append_log("INFO", "Loaded installer context");
    yambuck_core::installer_context(env!("CARGO_PKG_VERSION"))
}

pub(crate) fn inspect_package_impl(package_file: &str) -> Result<PackageInfo, String> {
    yambuck_core::inspect_package(package_file).map_err(|error| error.to_string())
}

pub(crate) fn inspect_package_workflow_impl(
    package_file: &str,
) -> Result<InstallWorkflowSession, String> {
    let workflow =
        yambuck_core::inspect_package_workflow(package_file).map_err(|error| error.to_string())?;
    store_workflow_session(workflow)
}

pub(crate) fn validate_install_options_impl(
    workflow_id: &str,
    submissions: Vec<InstallOptionSubmission>,
) -> Result<Vec<InstallOptionSubmission>, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    yambuck_core::validate_install_options(&workflow.install_options, submissions)
        .map_err(|error| error.to_string())
}

pub(crate) fn get_install_decision_impl(workflow_id: &str) -> Result<InstallDecision, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    yambuck_core::evaluate_install_decision(&workflow.package_info)
        .map_err(|error| error.to_string())
}

pub(crate) fn create_install_preview_impl(
    workflow_id: &str,
    scope: &str,
    verified_publisher: bool,
) -> Result<InstallPreview, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    let package_info = workflow.package_info;
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::create_install_preview(
        &package_info.package_file,
        &package_info.app_id,
        install_scope,
        verified_publisher,
    )
    .map_err(|error| error.to_string())
}

pub(crate) fn list_installed_apps_impl() -> Vec<InstalledApp> {
    yambuck_core::list_installed_apps()
}

pub(crate) fn get_installed_app_details_impl(
    app_id: &str,
    scope: &str,
) -> Result<InstalledAppDetails, String> {
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::get_installed_app_details(app_id, install_scope).map_err(|error| error.to_string())
}

pub(crate) fn uninstall_installed_app_impl(
    app_id: &str,
    scope: &str,
    remove_user_data: bool,
) -> Result<UninstallResult, String> {
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::uninstall_installed_app(app_id, install_scope, remove_user_data)
        .map_err(|error| error.to_string())
}

pub(crate) fn complete_install_impl(
    workflow_id: &str,
    scope: &str,
    destination_path: &str,
    submissions: Vec<InstallOptionSubmission>,
    allow_downgrade: bool,
) -> Result<InstalledApp, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    let _ = support::logging::append_log(
        "INFO",
        &format!(
            "Starting install for appId={} scope={scope} destination={destination_path}",
            workflow.package_info.app_id
        ),
    );
    yambuck_core::validate_install_options(&workflow.install_options, submissions)
        .map_err(|error| error.to_string())?;
    let package_info = workflow.package_info;

    let verified_package = yambuck_core::inspect_package(&package_info.package_file)
        .map_err(|error| error.to_string())?;
    if verified_package.package_uuid != package_info.package_uuid
        || verified_package.app_uuid != package_info.app_uuid
        || verified_package.app_id != package_info.app_id
    {
        return Err(
            "Package integrity check failed: package metadata changed since inspection. Re-open the package and try again."
                .to_string(),
        );
    }

    let installed_app = match install_scope {
        yambuck_core::InstallScope::User => yambuck_core::install_and_register(
            &package_info,
            install_scope,
            destination_path,
            allow_downgrade,
        )
        .map_err(|error| error.to_string())?,
        yambuck_core::InstallScope::System => support::elevation::install_with_elevation_if_needed(
            &package_info,
            destination_path,
            allow_downgrade,
        )?,
    };
    let _ = support::logging::append_log(
        "INFO",
        &format!(
            "Install completed for appId={} scope={scope}",
            installed_app.app_id
        ),
    );
    if let Err(error) = support::desktop_integration::ensure_desktop_integration() {
        let _ = support::logging::append_log(
            "WARN",
            &format!("Desktop integration refresh failed after install: {error}"),
        );
    }
    remove_workflow_session(workflow_id)?;
    Ok(installed_app)
}

pub fn maybe_run_elevated_install_mode(args: &[String]) -> Option<i32> {
    support::elevation::maybe_run_elevated_install_mode(args)
}

pub(crate) fn launch_installed_app_impl(app_id: &str, scope: &str) -> Result<(), String> {
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::launch_installed_app(app_id, install_scope).map_err(|error| error.to_string())
}

pub(crate) fn preflight_install_check_impl(app_id: &str) -> Result<PreflightCheckResult, String> {
    yambuck_core::preflight_install_check(app_id).map_err(|error| error.to_string())
}

pub(crate) fn get_startup_package_arg_impl() -> Option<String> {
    let args = std::env::args().collect::<Vec<String>>();
    support::launch_args::package_arg_from_launch_args(&args)
}

pub(crate) async fn check_for_updates_impl(
    feed_url: Option<String>,
) -> Result<UpdateCheckResult, String> {
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

pub(crate) fn open_logs_directory_impl() -> Result<(), String> {
    let log_file = support::logging::log_file_path()?;
    let log_dir = log_file
        .parent()
        .ok_or_else(|| "invalid log directory path".to_string())?
        .to_path_buf();

    std::fs::create_dir_all(&log_dir).map_err(|error| error.to_string())?;

    std::process::Command::new("xdg-open")
        .arg(&log_dir)
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok(())
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
        .setup(|_app| {
            if let Err(error) = support::desktop_integration::ensure_desktop_integration() {
                let _ = support::logging::append_log(
                    "WARN",
                    &format!("Desktop integration setup failed: {error}"),
                );
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::installer::get_installer_context,
            commands::installer::inspect_package,
            commands::installer::inspect_package_workflow,
            commands::installer::validate_install_options,
            commands::installer::get_install_decision,
            commands::installer::discard_install_workflow,
            commands::installer::create_install_preview,
            commands::update::check_for_updates,
            commands::update::apply_update_and_restart,
            commands::system::get_system_info,
            commands::logs::get_recent_logs,
            commands::logs::clear_logs,
            commands::logs::log_ui_event,
            commands::logs::open_logs_directory,
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
