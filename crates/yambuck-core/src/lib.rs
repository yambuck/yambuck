use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use zip::ZipArchive;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallerContext {
    pub product_name: String,
    pub app_version: String,
    pub platform: String,
    pub default_scope: InstallScope,
    pub trust_mode: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageInfo {
    pub package_file: String,
    pub file_name: String,
    pub display_name: String,
    pub app_id: String,
    pub app_uuid: String,
    pub version: String,
    pub publisher: String,
    pub package_uuid: String,
    pub trust_status: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallPreview {
    pub package_file: String,
    pub install_scope: InstallScope,
    pub destination_path: String,
    pub trust_status: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub app_id: String,
    pub display_name: String,
    pub version: String,
    pub install_scope: InstallScope,
    pub installed_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstalledAppRecord {
    app_id: String,
    app_uuid: String,
    display_name: String,
    version: String,
    install_scope: InstallScope,
    installed_at: String,
    destination_path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PackageManifest {
    package_uuid: String,
    app_id: String,
    app_uuid: String,
    display_name: String,
    version: String,
    publisher: String,
    trust_status: Option<String>,
}

#[derive(Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InstallScope {
    User,
    System,
}

impl TryFrom<&str> for InstallScope {
    type Error = YambuckError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "user" => Ok(InstallScope::User),
            "system" => Ok(InstallScope::System),
            _ => Err(YambuckError::InvalidInstallScope),
        }
    }
}

#[derive(Debug)]
pub enum YambuckError {
    InvalidInstallScope,
    InvalidPackageFile,
    InvalidManifest,
    InvalidAppId,
    AppNotInstalled,
    StorageUnavailable,
}

impl Display for YambuckError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            YambuckError::InvalidInstallScope => formatter.write_str("invalid install scope"),
            YambuckError::InvalidPackageFile => formatter.write_str("invalid package file"),
            YambuckError::InvalidManifest => formatter.write_str("invalid package manifest"),
            YambuckError::InvalidAppId => formatter.write_str("invalid app id"),
            YambuckError::AppNotInstalled => formatter.write_str("app is not installed"),
            YambuckError::StorageUnavailable => formatter.write_str("local storage unavailable"),
        }
    }
}

impl std::error::Error for YambuckError {}

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
    let file_path = Path::new(package_file);
    let file_name = file_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or(YambuckError::InvalidPackageFile)?;

    if !file_name.ends_with(".yambuck") {
        return Err(YambuckError::InvalidPackageFile);
    }

    let package = fs::File::open(file_path).map_err(|_| YambuckError::InvalidPackageFile)?;
    let mut archive = ZipArchive::new(package).map_err(|_| YambuckError::InvalidPackageFile)?;
    let mut manifest_file = archive
        .by_name("manifest.json")
        .map_err(|_| YambuckError::InvalidManifest)?;
    let mut manifest_content = String::new();
    manifest_file
        .read_to_string(&mut manifest_content)
        .map_err(|_| YambuckError::InvalidManifest)?;

    let manifest: PackageManifest =
        serde_json::from_str(&manifest_content).map_err(|_| YambuckError::InvalidManifest)?;

    if manifest.app_id.trim().is_empty() || manifest.app_uuid.trim().is_empty() {
        return Err(YambuckError::InvalidManifest);
    }

    let trust_status = sanitize_trust_status(manifest.trust_status.as_deref());

    Ok(PackageInfo {
        package_file: package_file.to_string(),
        file_name: file_name.to_string(),
        display_name: manifest.display_name,
        app_id: manifest.app_id,
        app_uuid: manifest.app_uuid,
        version: manifest.version,
        publisher: manifest.publisher,
        package_uuid: manifest.package_uuid,
        trust_status,
    })
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
    records.retain(|record| record.app_id != package_info.app_id);

    let installed_at = current_unix_timestamp();
    let record = InstalledAppRecord {
        app_id: package_info.app_id.clone(),
        app_uuid: package_info.app_uuid.clone(),
        display_name: package_info.display_name.clone(),
        version: package_info.version.clone(),
        install_scope: scope,
        installed_at: installed_at.clone(),
        destination_path: destination_path.to_string(),
    };
    records.push(record);
    write_index(scope, &records)?;

    Ok(InstalledApp {
        app_id: package_info.app_id.clone(),
        display_name: package_info.display_name.clone(),
        version: package_info.version.clone(),
        install_scope: scope,
        installed_at,
    })
}

pub fn list_installed_apps() -> Vec<InstalledApp> {
    let mut apps = Vec::new();
    for scope in [InstallScope::User, InstallScope::System] {
        if let Ok(records) = read_index(scope) {
            apps.extend(records.into_iter().map(|record| InstalledApp {
                app_id: record.app_id,
                display_name: record.display_name,
                version: record.version,
                install_scope: record.install_scope,
                installed_at: record.installed_at,
            }));
        }
    }
    apps.sort_by(|left, right| left.display_name.cmp(&right.display_name));
    apps
}

pub fn uninstall_installed_app(app_id: &str, remove_user_data: bool) -> Result<(), YambuckError> {
    if app_id.trim().is_empty() {
        return Err(YambuckError::InvalidAppId);
    }

    let mut removed_any = false;
    for scope in [InstallScope::User, InstallScope::System] {
        let mut records = match read_index(scope) {
            Ok(value) => value,
            Err(_) => continue,
        };

        let mut removed_destination: Option<String> = None;
        records.retain(|record| {
            if record.app_id == app_id {
                removed_destination = Some(record.destination_path.clone());
                false
            } else {
                true
            }
        });

        if let Some(destination_path) = removed_destination {
            write_index(scope, &records)?;
            removed_any = true;
            if remove_user_data {
                let _ = maybe_remove_app_data(&destination_path);
            }
        }
    }

    if !removed_any {
        return Err(YambuckError::AppNotInstalled);
    }

    Ok(())
}

fn sanitize_trust_status(value: Option<&str>) -> String {
    match value {
        Some("verified") => "verified".to_string(),
        _ => "unverified".to_string(),
    }
}

fn read_index(scope: InstallScope) -> Result<Vec<InstalledAppRecord>, YambuckError> {
    let path = index_file_path(scope)?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path).map_err(|_| YambuckError::StorageUnavailable)?;
    let records = serde_json::from_str::<Vec<InstalledAppRecord>>(&content)
        .map_err(|_| YambuckError::StorageUnavailable)?;
    Ok(records)
}

fn write_index(scope: InstallScope, records: &[InstalledAppRecord]) -> Result<(), YambuckError> {
    let path = index_file_path(scope)?;
    let parent = path.parent().ok_or(YambuckError::StorageUnavailable)?;
    fs::create_dir_all(parent).map_err(|_| YambuckError::StorageUnavailable)?;
    let content =
        serde_json::to_string_pretty(records).map_err(|_| YambuckError::StorageUnavailable)?;
    fs::write(path, content).map_err(|_| YambuckError::StorageUnavailable)
}

fn index_file_path(scope: InstallScope) -> Result<PathBuf, YambuckError> {
    match scope {
        InstallScope::User => {
            let home = std::env::var("HOME").map_err(|_| YambuckError::StorageUnavailable)?;
            Ok(PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("yambuck")
                .join("installed-apps.json"))
        }
        InstallScope::System => Ok(PathBuf::from("/var/lib/yambuck/installed-apps.json")),
    }
}

fn maybe_remove_app_data(destination_path: &str) -> Result<(), YambuckError> {
    if destination_path.contains("/yambuck/apps/") {
        let path = Path::new(destination_path);
        if path.exists() {
            fs::remove_dir_all(path).map_err(|_| YambuckError::StorageUnavailable)?;
        }
    }
    Ok(())
}

fn current_unix_timestamp() -> String {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    duration.as_secs().to_string()
}
