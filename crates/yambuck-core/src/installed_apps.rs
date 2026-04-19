use std::fs;
use std::path::{Path, PathBuf};

use crate::package_inspection;
use crate::storage::{
    find_installed_record, is_record_owned, managed_app_payload_root, maybe_remove_package_archive,
    read_index, write_index, InstalledAppRecord,
};
use crate::{
    InstallScope, InstalledApp, InstalledAppDetails, PreflightCheckResult, UninstallResult,
    YambuckError,
};

pub fn list_installed_apps() -> Vec<InstalledApp> {
    let mut apps = Vec::new();
    for scope in [InstallScope::User, InstallScope::System] {
        if let Ok(records) = read_index(scope) {
            apps.extend(records.into_iter().filter(is_record_owned).map(|record| {
                let icon_data_url = record
                    .package_archive_path
                    .as_ref()
                    .and_then(|archive_path| package_inspection::inspect_package(archive_path).ok())
                    .and_then(|package| package.icon_data_url);

                InstalledApp {
                    app_id: record.app_id,
                    display_name: record.display_name,
                    version: record.version,
                    install_scope: record.install_scope,
                    installed_at: record.installed_at,
                    icon_data_url,
                }
            }));
        }
    }
    apps.sort_by(|left, right| left.display_name.cmp(&right.display_name));
    apps
}

pub fn get_installed_app_details(app_id: &str) -> Result<InstalledAppDetails, YambuckError> {
    if app_id.trim().is_empty() {
        return Err(YambuckError::InvalidAppId);
    }

    let record = find_installed_record(app_id).ok_or(YambuckError::AppNotInstalled)?;
    let archive_path = record
        .package_archive_path
        .clone()
        .ok_or(YambuckError::MetadataUnavailable)?;

    if !Path::new(&archive_path).exists() {
        return Err(YambuckError::MetadataUnavailable);
    }

    let package_info = package_inspection::inspect_package(&archive_path)?;
    Ok(InstalledAppDetails {
        app_id: record.app_id,
        display_name: record.display_name,
        version: record.version,
        install_scope: record.install_scope,
        installed_at: record.installed_at,
        destination_path: record.destination_path,
        package_info,
    })
}

pub fn uninstall_installed_app(
    app_id: &str,
    scope: InstallScope,
    remove_user_data: bool,
) -> Result<UninstallResult, YambuckError> {
    if app_id.trim().is_empty() {
        return Err(YambuckError::InvalidAppId);
    }

    let mut records = read_index(scope)?;

    let mut removed_record: Option<InstalledAppRecord> = None;
    records.retain(|record| {
        if record.app_id == app_id && is_record_owned(record) {
            removed_record = Some(record.clone());
            false
        } else {
            true
        }
    });

    let Some(record) = removed_record else {
        return Err(YambuckError::AppNotInstalled);
    };

    write_index(scope, &records)?;

    let mut warnings = Vec::new();
    let mut manifest_paths = Vec::new();

    if let Some(archive_path) = record.package_archive_path.as_ref() {
        if let Ok(package_info) = package_inspection::inspect_package(archive_path) {
            manifest_paths.push(package_info.config_path);
            manifest_paths.push(package_info.cache_path);
            manifest_paths.push(package_info.temp_path);
        }
    }

    let mut removed_app_files = true;
    if let Err(error) = maybe_remove_install_path(&record.destination_path, scope) {
        removed_app_files = false;
        warnings.push(format!("Unable to remove app files: {error}"));
    }

    if let Err(error) = maybe_remove_package_archive(record.package_archive_path.as_deref()) {
        warnings.push(format!(
            "Unable to remove archived package snapshot: {error}"
        ));
    }

    if remove_user_data {
        for path in manifest_paths.into_iter().flatten() {
            if let Err(error) = maybe_remove_user_data_path(&path, scope) {
                warnings.push(format!("Unable to remove user data path {path}: {error}"));
            }
        }
    }

    Ok(UninstallResult {
        app_id: app_id.to_string(),
        install_scope: scope,
        removed_app_files,
        removed_user_data: remove_user_data,
        warnings,
    })
}

pub fn launch_installed_app(app_id: &str) -> Result<(), YambuckError> {
    if app_id.trim().is_empty() {
        return Err(YambuckError::InvalidAppId);
    }

    let record = find_installed_record(app_id).ok_or(YambuckError::AppNotInstalled)?;
    let executable_path = resolve_entrypoint_path(&record.destination_path, &record.entrypoint)?;

    if !executable_path.exists() {
        return Err(YambuckError::LaunchFailed);
    }

    std::process::Command::new(&executable_path)
        .current_dir(executable_path.parent().unwrap_or_else(|| Path::new("/")))
        .spawn()
        .map_err(|_| YambuckError::LaunchFailed)?;

    Ok(())
}

pub fn preflight_install_check(app_id: &str) -> Result<PreflightCheckResult, YambuckError> {
    if app_id.trim().is_empty() {
        return Err(YambuckError::InvalidAppId);
    }

    let managed_install_exists = is_app_tracked_by_yambuck(app_id);
    let external_conflict = detect_external_install_conflict(app_id);

    if external_conflict && !managed_install_exists {
        return Ok(PreflightCheckResult {
            status: "external_conflict".to_string(),
            message: format!(
                "{app_id} appears to be installed by another package system. Uninstall it there first, then install via Yambuck."
            ),
        });
    }

    if managed_install_exists {
        return Ok(PreflightCheckResult {
            status: "managed_existing".to_string(),
            message:
                "An existing Yambuck-managed install was found. Continuing will replace it cleanly."
                    .to_string(),
        });
    }

    Ok(PreflightCheckResult {
        status: "ok".to_string(),
        message: "No install conflicts detected.".to_string(),
    })
}

fn resolve_entrypoint_path(
    destination_path: &str,
    entrypoint: &str,
) -> Result<PathBuf, YambuckError> {
    let entrypoint_path = Path::new(entrypoint);
    if entrypoint.trim().is_empty() || entrypoint_path.is_absolute() {
        return Err(YambuckError::LaunchFailed);
    }

    if entrypoint_path
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Err(YambuckError::LaunchFailed);
    }

    Ok(PathBuf::from(destination_path).join(entrypoint_path))
}

fn is_app_tracked_by_yambuck(app_id: &str) -> bool {
    [InstallScope::User, InstallScope::System]
        .into_iter()
        .filter_map(|scope| read_index(scope).ok())
        .flatten()
        .any(|record| record.app_id == app_id)
}

fn detect_external_install_conflict(app_id: &str) -> bool {
    let desktop_file = format!("{app_id}.desktop");
    let desktop_paths = [
        PathBuf::from("/usr/share/applications").join(&desktop_file),
        PathBuf::from("/usr/local/share/applications").join(&desktop_file),
    ];

    let mut has_external_desktop_entry = desktop_paths.iter().any(|path| path.exists());

    if !has_external_desktop_entry {
        if let Ok(home) = std::env::var("HOME") {
            let local_desktop = PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("applications")
                .join(&desktop_file);
            has_external_desktop_entry = local_desktop.exists();
        }
    }

    has_external_desktop_entry
}

fn maybe_remove_install_path(destination_path: &str, scope: InstallScope) -> Result<(), YambuckError> {
    let managed_root = managed_app_payload_root(scope)?;
    let path = Path::new(destination_path);

    if !path.is_absolute() {
        return Ok(());
    }

    if path
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Ok(());
    }

    if !path.starts_with(&managed_root) {
        return Ok(());
    }

    if path.exists() {
        fs::remove_dir_all(path).map_err(|_| YambuckError::StorageUnavailable)?;
    }

    Ok(())
}

fn maybe_remove_user_data_path(value: &str, scope: InstallScope) -> Result<(), YambuckError> {
    let path = Path::new(value);
    if !path.is_absolute() || value == "/" {
        return Ok(());
    }

    let allowed = match scope {
        InstallScope::User => std::env::var("HOME")
            .ok()
            .map(|home| path.starts_with(Path::new(&home)))
            .unwrap_or(false),
        InstallScope::System => path.starts_with("/var") || path.starts_with("/opt"),
    };

    if !allowed {
        return Ok(());
    }

    if !path.exists() {
        return Ok(());
    }

    if path.is_file() {
        fs::remove_file(path).map_err(|_| YambuckError::StorageUnavailable)?;
    } else if path.is_dir() {
        fs::remove_dir_all(path).map_err(|_| YambuckError::StorageUnavailable)?;
    }

    Ok(())
}
