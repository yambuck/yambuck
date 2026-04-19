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

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OwnershipReceipt {
    app_id: String,
    app_uuid: String,
    install_scope: InstallScope,
    version: String,
    installed_at: String,
    entrypoint: String,
    package_archive_path: Option<String>,
    managed_paths: Vec<String>,
    installed_files: Vec<String>,
    recorded_at: String,
    destination_path: String,
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
        .find(|record| record.app_id == app_id && is_record_owned(record))
}

pub(crate) fn write_ownership_receipt(record: &InstalledAppRecord) -> Result<(), YambuckError> {
    let receipt_path = ownership_receipt_path(&record.destination_path);
    let parent = receipt_path
        .parent()
        .ok_or(YambuckError::StorageUnavailable)?;
    fs::create_dir_all(parent).map_err(|_| YambuckError::StorageUnavailable)?;

    let mut managed_paths = vec![record.destination_path.clone()];
    if let Some(path) = record.package_archive_path.as_ref() {
        managed_paths.push(path.clone());
    }

    let receipt = OwnershipReceipt {
        app_id: record.app_id.clone(),
        app_uuid: record.app_uuid.clone(),
        install_scope: record.install_scope,
        version: record.version.clone(),
        installed_at: record.installed_at.clone(),
        entrypoint: record.entrypoint.clone(),
        package_archive_path: record.package_archive_path.clone(),
        managed_paths,
        installed_files: collect_installed_files(&record.destination_path)?,
        recorded_at: current_canonical_timestamp(),
        destination_path: record.destination_path.clone(),
    };
    let content =
        serde_json::to_string_pretty(&receipt).map_err(|_| YambuckError::StorageUnavailable)?;
    fs::write(receipt_path, content).map_err(|_| YambuckError::StorageUnavailable)
}

pub(crate) fn maybe_remove_ownership_receipt(destination_path: &str) {
    let receipt_path = ownership_receipt_path(destination_path);
    if receipt_path.exists() {
        let _ = fs::remove_file(&receipt_path);
    }
    if let Some(parent) = receipt_path.parent() {
        if parent.exists() {
            let _ = fs::remove_dir(parent);
        }
    }
}

pub(crate) fn is_record_owned(record: &InstalledAppRecord) -> bool {
    let receipt_path = ownership_receipt_path(&record.destination_path);
    let Ok(content) = fs::read_to_string(receipt_path) else {
        return false;
    };
    let Ok(receipt) = serde_json::from_str::<OwnershipReceipt>(&content) else {
        return false;
    };

    receipt.app_id == record.app_id
        && receipt.app_uuid == record.app_uuid
        && receipt.install_scope == record.install_scope
        && receipt.destination_path == record.destination_path
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

fn ownership_receipt_path(destination_path: &str) -> PathBuf {
    PathBuf::from(destination_path)
        .join(".yambuck")
        .join("ownership.json")
}

fn collect_installed_files(destination_path: &str) -> Result<Vec<String>, YambuckError> {
    let root = PathBuf::from(destination_path);
    if !root.exists() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    collect_relative_files(&root, &root, &mut files)?;
    files.sort();
    Ok(files)
}

fn collect_relative_files(
    root: &Path,
    current: &Path,
    files: &mut Vec<String>,
) -> Result<(), YambuckError> {
    let entries = fs::read_dir(current).map_err(|_| YambuckError::StorageUnavailable)?;
    for entry in entries {
        let path = entry.map_err(|_| YambuckError::StorageUnavailable)?.path();
        if path.is_dir() {
            collect_relative_files(root, &path, files)?;
            continue;
        }
        if path.is_file() {
            let relative = path
                .strip_prefix(root)
                .map_err(|_| YambuckError::StorageUnavailable)?;
            files.push(relative.to_string_lossy().to_string());
        }
    }
    Ok(())
}
