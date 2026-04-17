use yambuck_core::{
    InstallPreview, InstalledApp, InstalledAppDetails, InstallerContext, PackageInfo,
    PreflightCheckResult, UninstallResult,
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
pub fn create_install_preview(
    package_file: &str,
    app_id: &str,
    scope: &str,
    verified_publisher: bool,
) -> Result<InstallPreview, String> {
    crate::create_install_preview_impl(package_file, app_id, scope, verified_publisher)
}

#[tauri::command]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    crate::list_installed_apps_impl()
}

#[tauri::command]
pub fn get_installed_app_details(app_id: &str) -> Result<InstalledAppDetails, String> {
    crate::get_installed_app_details_impl(app_id)
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
    package_info: PackageInfo,
    scope: &str,
    destination_path: &str,
) -> Result<InstalledApp, String> {
    crate::complete_install_impl(package_info, scope, destination_path)
}

#[tauri::command]
pub fn launch_installed_app(app_id: &str) -> Result<(), String> {
    crate::launch_installed_app_impl(app_id)
}

#[tauri::command]
pub fn preflight_install_check(app_id: &str) -> Result<PreflightCheckResult, String> {
    crate::preflight_install_check_impl(app_id)
}

#[tauri::command]
pub fn get_startup_package_arg() -> Option<String> {
    crate::get_startup_package_arg_impl()
}
