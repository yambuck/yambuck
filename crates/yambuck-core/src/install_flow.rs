use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
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

    let mut transaction = prepare_install_transaction(package_file, destination_path)?;
    transaction.commit()?;
    transaction.finalize_success()
}

struct InstallTransaction {
    destination_root: PathBuf,
    staging_root: PathBuf,
    backup_root: Option<PathBuf>,
    committed: bool,
}

impl InstallTransaction {
    fn commit(&mut self) -> Result<(), YambuckError> {
        if self.committed {
            return Ok(());
        }

        if self.destination_root.exists() {
            let backup_root = self
                .backup_root
                .as_ref()
                .ok_or(YambuckError::InstallFailed)?;
            fs::rename(&self.destination_root, backup_root)
                .map_err(|_| YambuckError::InstallFailed)?;
        }

        if fs::rename(&self.staging_root, &self.destination_root).is_err() {
            if let Some(backup_root) = self.backup_root.as_ref() {
                if !self.destination_root.exists() {
                    let _ = fs::rename(backup_root, &self.destination_root);
                }
            }
            return Err(YambuckError::InstallFailed);
        }

        self.committed = true;
        Ok(())
    }

    fn rollback(&mut self) {
        let _ = fs::remove_dir_all(&self.staging_root);

        if self.committed {
            let _ = fs::remove_dir_all(&self.destination_root);
        }

        if let Some(backup_root) = self.backup_root.as_ref() {
            if backup_root.exists() {
                let _ = fs::rename(backup_root, &self.destination_root);
            }
        }
    }

    fn finalize_success(&mut self) -> Result<(), YambuckError> {
        if let Some(backup_root) = self.backup_root.as_ref() {
            if backup_root.exists() {
                fs::remove_dir_all(backup_root).map_err(|_| YambuckError::InstallFailed)?;
            }
        }
        Ok(())
    }
}

fn prepare_install_transaction(
    package_file: &str,
    destination_path: &str,
) -> Result<InstallTransaction, YambuckError> {
    let destination_root = PathBuf::from(destination_path);
    let destination_parent = destination_root
        .parent()
        .ok_or(YambuckError::InstallFailed)?;
    fs::create_dir_all(destination_parent).map_err(|_| YambuckError::InstallFailed)?;

    let unique_suffix = unique_install_suffix();
    let staging_root = destination_parent.join(format!(".yambuck-staging-{}", unique_suffix));
    let backup_root = destination_parent.join(format!(".yambuck-backup-{}", unique_suffix));

    fs::create_dir_all(&staging_root).map_err(|_| YambuckError::InstallFailed)?;

    let extraction_result = extract_package_to_root(package_file, &staging_root);
    if let Err(error) = extraction_result {
        let _ = fs::remove_dir_all(&staging_root);
        return Err(error);
    }

    Ok(InstallTransaction {
        destination_root,
        staging_root,
        backup_root: Some(backup_root),
        committed: false,
    })
}

fn extract_package_to_root(
    package_file: &str,
    destination_root: &Path,
) -> Result<(), YambuckError> {
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

fn unique_install_suffix() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let pid = std::process::id();
    format!("{pid}-{nanos}")
}

pub fn install_and_register(
    package_info: &PackageInfo,
    scope: InstallScope,
    destination_path: &str,
) -> Result<InstalledApp, YambuckError> {
    let mut transaction =
        prepare_install_transaction(&package_info.package_file, destination_path)?;
    transaction.commit()?;

    let installed_app = match register_install(package_info, scope, destination_path) {
        Ok(value) => value,
        Err(error) => {
            transaction.rollback();
            return Err(error);
        }
    };

    transaction.finalize_success()?;
    Ok(installed_app)
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
    if write_index(scope, &records).is_err() {
        let _ = maybe_remove_package_archive(Some(package_archive_path.as_str()));
        return Err(YambuckError::StorageUnavailable);
    }

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
