use crate::InstallWorkflowSession;
use yambuck_core::{
    InstallDecision, InstallOptionSubmission, InstallPreview, InstalledApp, InstalledAppDetails,
    InstallerContext, PackageInfo, PreflightCheckResult, UninstallResult,
};

#[tauri::command]
pub fn get_installer_context() -> InstallerContext {
    crate::get_installer_context_impl()
}

#[tauri::command]
pub fn inspect_package(package_file: &str) -> Result<PackageInfo, String> {
    crate::inspect_package_impl(package_file)
}

#[tauri::command]
pub fn inspect_package_workflow(package_file: &str) -> Result<InstallWorkflowSession, String> {
    crate::inspect_package_workflow_impl(package_file)
}

#[tauri::command]
pub fn validate_install_options(
    workflow_id: &str,
    submissions: Vec<InstallOptionSubmission>,
) -> Result<Vec<InstallOptionSubmission>, String> {
    crate::validate_install_options_impl(workflow_id, submissions)
}

#[tauri::command]
pub fn get_install_decision(workflow_id: &str, scope: &str) -> Result<InstallDecision, String> {
    crate::get_install_decision_impl(workflow_id, scope)
}

#[tauri::command]
pub fn discard_install_workflow(workflow_id: &str) -> Result<(), String> {
    crate::discard_install_workflow_impl(workflow_id)
}

#[tauri::command]
pub fn create_install_preview(
    workflow_id: &str,
    scope: &str,
    verified_publisher: bool,
) -> Result<InstallPreview, String> {
    crate::create_install_preview_impl(workflow_id, scope, verified_publisher)
}

#[tauri::command]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    crate::list_installed_apps_impl()
}

#[tauri::command]
pub fn get_installed_app_details(app_id: &str, scope: &str) -> Result<InstalledAppDetails, String> {
    crate::get_installed_app_details_impl(app_id, scope)
}

#[tauri::command]
pub fn uninstall_installed_app(
    app_id: &str,
    scope: &str,
    remove_user_data: bool,
) -> Result<UninstallResult, String> {
    crate::uninstall_installed_app_impl(app_id, scope, remove_user_data)
}

#[tauri::command]
pub fn complete_install(
    workflow_id: &str,
    scope: &str,
    destination_path: &str,
    submissions: Vec<InstallOptionSubmission>,
    allow_downgrade: bool,
) -> Result<InstalledApp, String> {
    crate::complete_install_impl(
        workflow_id,
        scope,
        destination_path,
        submissions,
        allow_downgrade,
    )
}

#[tauri::command]
pub fn launch_installed_app(app_id: &str, scope: &str) -> Result<(), String> {
    crate::launch_installed_app_impl(app_id, scope)
}

#[tauri::command]
pub fn preflight_install_check(app_id: &str) -> Result<PreflightCheckResult, String> {
    crate::preflight_install_check_impl(app_id)
}

#[tauri::command]
pub fn get_startup_package_arg() -> Option<String> {
    crate::get_startup_package_arg_impl()
}
