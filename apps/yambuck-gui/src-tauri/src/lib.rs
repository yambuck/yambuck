use yambuck_core::{InstallPreview, InstalledApp, InstallerContext, PackageInfo};

#[tauri::command]
fn get_installer_context() -> InstallerContext {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_installer_context,
            inspect_package,
            create_install_preview,
            list_installed_apps,
            uninstall_installed_app,
            complete_install
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
