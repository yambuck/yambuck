use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use zip::ZipArchive;

use crate::storage::{
    archive_package_file, current_unix_timestamp, maybe_remove_package_archive, read_index,
    write_index, InstalledAppRecord,
};
use crate::{InstallPreview, InstallScope, InstalledApp, PackageInfo, YambuckError};

pub fn install_package(package_file: &str, destination_path: &str) -> Result<(), YambuckError> {
    if package_file.trim().is_empty() || !package_file.ends_with(".yambuck") {
        return Err(YambuckError::InvalidPackageFile);
    }
    if destination_path.trim().is_empty() {
        return Err(YambuckError::InstallFailed);
    }

    let destination_root = Path::new(destination_path);
    if destination_root.exists() {
        fs::remove_dir_all(destination_root).map_err(|_| YambuckError::InstallFailed)?;
    }
    fs::create_dir_all(destination_root).map_err(|_| YambuckError::InstallFailed)?;

    let package = fs::File::open(package_file).map_err(|_| YambuckError::InvalidPackageFile)?;
    let mut archive = ZipArchive::new(package).map_err(|_| YambuckError::InvalidPackageFile)?;

    let mut installed_any = false;
    for index in 0..archive.len() {
        let mut file = archive
            .by_index(index)
            .map_err(|_| YambuckError::InstallFailed)?;

        let Some(entry_path) = file.enclosed_name() else {
            continue;
        };

        if !entry_path.starts_with(Path::new("app")) {
            continue;
        }

        installed_any = true;

        let output_path = destination_root.join(&entry_path);

        if file.is_dir() {
            fs::create_dir_all(&output_path).map_err(|_| YambuckError::InstallFailed)?;
            continue;
        }

        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent).map_err(|_| YambuckError::InstallFailed)?;
        }

        let mut output = fs::File::create(&output_path).map_err(|_| YambuckError::InstallFailed)?;
        std::io::copy(&mut file, &mut output).map_err(|_| YambuckError::InstallFailed)?;

        if let Some(mode) = file.unix_mode() {
            fs::set_permissions(&output_path, fs::Permissions::from_mode(mode))
                .map_err(|_| YambuckError::InstallFailed)?;
        }
    }

    if !installed_any {
        return Err(YambuckError::InstallFailed);
    }

    Ok(())
}

pub fn install_and_register(
    package_info: &PackageInfo,
    scope: InstallScope,
    destination_path: &str,
) -> Result<InstalledApp, YambuckError> {
    install_package(&package_info.package_file, destination_path)?;
    register_install(package_info, scope, destination_path)
}

pub fn create_install_preview(
    package_file: &str,
    app_id: &str,
    scope: InstallScope,
    verified_publisher: bool,
) -> Result<InstallPreview, YambuckError> {
    if package_file.trim().is_empty() || !package_file.ends_with(".yambuck") {
        return Err(YambuckError::InvalidPackageFile);
    }
    if app_id.trim().is_empty() {
        return Err(YambuckError::InvalidAppId);
    }

    let destination_path = match scope {
        InstallScope::User => {
            let home = std::env::var("HOME").unwrap_or_else(|_| "~".to_string());
            format!("{home}/.local/share/yambuck/apps/{app_id}")
        }
        InstallScope::System => format!("/opt/yambuck/apps/{app_id}"),
    };

    let trust_status = if verified_publisher {
        "verified"
    } else {
        "unverified"
    }
    .to_string();

    Ok(InstallPreview {
        package_file: package_file.to_string(),
        install_scope: scope,
        destination_path,
        trust_status,
    })
}

pub fn register_install(
    package_info: &PackageInfo,
    scope: InstallScope,
    destination_path: &str,
) -> Result<InstalledApp, YambuckError> {
    if package_info.app_id.trim().is_empty() {
        return Err(YambuckError::InvalidAppId);
    }

    let mut records = read_index(scope)?;
    let mut replaced_records = Vec::new();
    records.retain(|record| {
        if record.app_id == package_info.app_id {
            replaced_records.push(record.clone());
            false
        } else {
            true
        }
    });

    let package_archive_path = archive_package_file(package_info, scope)?;

    let installed_at = current_unix_timestamp();
    let record = InstalledAppRecord {
        app_id: package_info.app_id.clone(),
        app_uuid: package_info.app_uuid.clone(),
        display_name: package_info.display_name.clone(),
        version: package_info.version.clone(),
        install_scope: scope,
        installed_at: installed_at.clone(),
        destination_path: destination_path.to_string(),
        entrypoint: package_info.entrypoint.clone(),
        package_archive_path: Some(package_archive_path.clone()),
    };
    records.push(record);
    write_index(scope, &records)?;

    for replaced in replaced_records {
        if replaced.package_archive_path.as_deref() != Some(package_archive_path.as_str()) {
            let _ = maybe_remove_package_archive(replaced.package_archive_path.as_deref());
        }
    }

    Ok(InstalledApp {
        app_id: package_info.app_id.clone(),
        display_name: package_info.display_name.clone(),
        version: package_info.version.clone(),
        install_scope: scope,
        installed_at,
        icon_data_url: package_info.icon_data_url.clone(),
    })
}
