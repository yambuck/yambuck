mod install_flow;
mod install_options;
mod installed_apps;
mod manifest;
mod package_inspection;
mod storage;
mod types;
mod update_feed;

pub use types::*;

pub fn installer_context(app_version: &str) -> InstallerContext {
    InstallerContext {
        product_name: "Yambuck".to_string(),
        app_version: app_version.to_string(),
        platform: std::env::consts::OS.to_string(),
        default_scope: InstallScope::User,
        trust_mode: "allow-unsigned-mvp".to_string(),
    }
}

pub fn inspect_package(package_file: &str) -> Result<PackageInfo, YambuckError> {
    package_inspection::inspect_package(package_file)
}

pub fn inspect_package_workflow(package_file: &str) -> Result<InstallWorkflow, YambuckError> {
    package_inspection::inspect_package_workflow(package_file)
}

pub fn validate_install_options_for_package(
    package_file: &str,
    submissions: Vec<InstallOptionSubmission>,
) -> Result<Vec<InstallOptionSubmission>, YambuckError> {
    let workflow = package_inspection::inspect_package_workflow(package_file)?;
    install_options::validate_install_options(&workflow.install_options, submissions)
}

pub fn validate_install_options(
    definitions: &[InstallOptionDefinition],
    submissions: Vec<InstallOptionSubmission>,
) -> Result<Vec<InstallOptionSubmission>, YambuckError> {
    install_options::validate_install_options(definitions, submissions)
}

pub fn install_package(package_file: &str, destination_path: &str) -> Result<(), YambuckError> {
    install_flow::install_package(package_file, destination_path)
}

pub fn install_and_register(
    package_info: &PackageInfo,
    scope: InstallScope,
    destination_path: &str,
) -> Result<InstalledApp, YambuckError> {
    install_flow::install_and_register(package_info, scope, destination_path)
}

pub fn create_install_preview(
    package_file: &str,
    app_id: &str,
    scope: InstallScope,
    verified_publisher: bool,
) -> Result<InstallPreview, YambuckError> {
    install_flow::create_install_preview(package_file, app_id, scope, verified_publisher)
}

pub fn register_install(
    package_info: &PackageInfo,
    scope: InstallScope,
    destination_path: &str,
) -> Result<InstalledApp, YambuckError> {
    install_flow::register_install(package_info, scope, destination_path)
}

pub fn list_installed_apps() -> Vec<InstalledApp> {
    installed_apps::list_installed_apps()
}

pub fn get_installed_app_details(app_id: &str) -> Result<InstalledAppDetails, YambuckError> {
    installed_apps::get_installed_app_details(app_id)
}

pub fn uninstall_installed_app(
    app_id: &str,
    scope: InstallScope,
    remove_user_data: bool,
) -> Result<UninstallResult, YambuckError> {
    installed_apps::uninstall_installed_app(app_id, scope, remove_user_data)
}

pub fn launch_installed_app(app_id: &str) -> Result<(), YambuckError> {
    installed_apps::launch_installed_app(app_id)
}

pub fn preflight_install_check(app_id: &str) -> Result<PreflightCheckResult, YambuckError> {
    installed_apps::preflight_install_check(app_id)
}

pub fn evaluate_update_feed(
    feed_json: &str,
    current_version: &str,
    machine_arch: &str,
) -> Result<UpdateCheckResult, YambuckError> {
    update_feed::evaluate_update_feed(feed_json, current_version, machine_arch)
}
