use chrono::{Local, SecondsFormat};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::{InstallScope, PackageInfo, YambuckError};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstalledAppRecord {
    pub app_id: String,
    pub app_uuid: String,
    pub display_name: String,
    pub version: String,
    pub install_scope: InstallScope,
    pub installed_at: String,
    pub destination_path: String,
    #[serde(default)]
    pub entrypoint: String,
    #[serde(default)]
    pub package_archive_path: Option<String>,
}

pub(crate) fn read_index(scope: InstallScope) -> Result<Vec<InstalledAppRecord>, YambuckError> {
    let path = index_file_path(scope)?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path).map_err(|_| YambuckError::StorageUnavailable)?;
    let records = serde_json::from_str::<Vec<InstalledAppRecord>>(&content)
        .map_err(|_| YambuckError::StorageUnavailable)?;
    Ok(records)
}

pub(crate) fn managed_app_payload_root(scope: InstallScope) -> Result<PathBuf, YambuckError> {
    match scope {
        InstallScope::User => {
            let home = std::env::var("HOME").map_err(|_| YambuckError::StorageUnavailable)?;
            Ok(PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("yambuck")
                .join("apps"))
        }
        InstallScope::System => Ok(PathBuf::from("/opt").join("yambuck").join("apps")),
    }
}

pub(crate) fn managed_app_destination_path(
    scope: InstallScope,
    app_id: &str,
) -> Result<PathBuf, YambuckError> {
    if app_id.trim().is_empty() {
        return Err(YambuckError::InvalidAppId);
    }
    let root = managed_app_payload_root(scope)?;
    Ok(root.join(safe_segment(app_id)))
}

pub(crate) fn write_index(
    scope: InstallScope,
    records: &[InstalledAppRecord],
) -> Result<(), YambuckError> {
    let path = index_file_path(scope)?;
    let parent = path.parent().ok_or(YambuckError::StorageUnavailable)?;
    fs::create_dir_all(parent).map_err(|_| YambuckError::StorageUnavailable)?;
    let content =
        serde_json::to_string_pretty(records).map_err(|_| YambuckError::StorageUnavailable)?;
    fs::write(path, content).map_err(|_| YambuckError::StorageUnavailable)
}

pub(crate) fn find_installed_record(app_id: &str) -> Option<InstalledAppRecord> {
    [InstallScope::User, InstallScope::System]
        .into_iter()
        .filter_map(|scope| read_index(scope).ok())
        .flatten()
        .find(|record| record.app_id == app_id)
}

pub(crate) fn archive_package_file(
    package_info: &PackageInfo,
    scope: InstallScope,
) -> Result<String, YambuckError> {
    let source_path = Path::new(&package_info.package_file);
    if !source_path.exists() {
        return Err(YambuckError::InvalidPackageFile);
    }

    let archive_root = package_archive_root(scope)?.join(safe_segment(&package_info.app_id));
    fs::create_dir_all(&archive_root).map_err(|_| YambuckError::StorageUnavailable)?;

    let file_name = if package_info.file_name.trim().is_empty() {
        "package.yambuck".to_string()
    } else {
        package_info.file_name.clone()
    };
    let archive_path = archive_root.join(file_name);
    fs::copy(source_path, &archive_path).map_err(|_| YambuckError::StorageUnavailable)?;

    Ok(archive_path.to_string_lossy().to_string())
}

pub(crate) fn maybe_remove_package_archive(path: Option<&str>) -> Result<(), YambuckError> {
    let Some(value) = path else {
        return Ok(());
    };

    let archive_path = Path::new(value);
    if archive_path.exists() {
        fs::remove_file(archive_path).map_err(|_| YambuckError::StorageUnavailable)?;
    }
    if let Some(parent) = archive_path.parent() {
        if parent.exists() {
            let _ = fs::remove_dir(parent);
        }
    }
    Ok(())
}

pub(crate) fn current_canonical_timestamp() -> String {
    Local::now().to_rfc3339_opts(SecondsFormat::Millis, false)
}

fn index_file_path(scope: InstallScope) -> Result<PathBuf, YambuckError> {
    metadata_root(scope).map(|root| root.join("installed-apps.json"))
}

fn package_archive_root(scope: InstallScope) -> Result<PathBuf, YambuckError> {
    metadata_root(scope).map(|root| root.join("package-archives"))
}

fn metadata_root(scope: InstallScope) -> Result<PathBuf, YambuckError> {
    match scope {
        InstallScope::User => {
            let home = std::env::var("HOME").map_err(|_| YambuckError::StorageUnavailable)?;
            Ok(PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("yambuck"))
        }
        InstallScope::System => Ok(PathBuf::from("/var").join("lib").join("yambuck")),
    }
}

fn safe_segment(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric()
                || character == '-'
                || character == '_'
                || character == '.'
            {
                character
            } else {
                '_'
            }
        })
        .collect()
}
