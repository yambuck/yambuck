use base64::Engine;
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
    pub manifest_version: String,
    pub publisher: String,
    pub description: String,
    pub entrypoint: String,
    pub icon_path: String,
    pub icon_data_url: Option<String>,
    pub screenshots: Vec<String>,
    pub screenshot_data_urls: Vec<String>,
    pub homepage_url: Option<String>,
    pub support_url: Option<String>,
    pub license: Option<String>,
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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreflightCheckResult {
    pub status: String,
    pub message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub channel: String,
    pub notes_url: Option<String>,
    pub download_url: Option<String>,
    pub sha256: Option<String>,
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
    manifest_version: String,
    package_uuid: String,
    app_id: String,
    app_uuid: String,
    display_name: String,
    description: String,
    version: String,
    publisher: String,
    entrypoint: String,
    icon_path: String,
    screenshots: Option<Vec<String>>,
    homepage_url: Option<String>,
    support_url: Option<String>,
    license: Option<String>,
    trust_status: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateFeed {
    channel: String,
    version: String,
    notes_url: Option<String>,
    linux: LinuxFeed,
}

#[derive(Deserialize)]
struct LinuxFeed {
    #[serde(rename = "x86_64")]
    x86_64: Option<UpdateAsset>,
    #[serde(rename = "aarch64")]
    aarch64: Option<UpdateAsset>,
}

#[derive(Clone, Deserialize)]
struct UpdateAsset {
    url: String,
    sha256: String,
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
    InvalidUpdateFeed,
    UnsupportedArchitecture,
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
            YambuckError::InvalidUpdateFeed => formatter.write_str("invalid update feed"),
            YambuckError::UnsupportedArchitecture => {
                formatter.write_str("unsupported system architecture")
            }
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
    let manifest_content = read_archive_file_to_string(&mut archive, "manifest.json")?;

    let manifest: PackageManifest =
        serde_json::from_str(&manifest_content).map_err(|_| YambuckError::InvalidManifest)?;

    if manifest.app_id.trim().is_empty()
        || manifest.app_uuid.trim().is_empty()
        || manifest.display_name.trim().is_empty()
        || manifest.description.trim().is_empty()
        || manifest.entrypoint.trim().is_empty()
        || manifest.icon_path.trim().is_empty()
        || manifest.manifest_version.trim().is_empty()
    {
        return Err(YambuckError::InvalidManifest);
    }

    if !is_supported_manifest_major(&manifest.manifest_version) {
        return Err(YambuckError::InvalidManifest);
    }

    let screenshots = manifest.screenshots.unwrap_or_default();
    let icon_data_url = read_archive_asset_as_data_url(&mut archive, &manifest.icon_path).ok();
    let screenshot_data_urls = screenshots
        .iter()
        .take(5)
        .filter_map(|path| read_archive_asset_as_data_url(&mut archive, path).ok())
        .collect::<Vec<String>>();

    let trust_status = sanitize_trust_status(manifest.trust_status.as_deref());

    Ok(PackageInfo {
        package_file: package_file.to_string(),
        file_name: file_name.to_string(),
        display_name: manifest.display_name,
        app_id: manifest.app_id,
        app_uuid: manifest.app_uuid,
        version: manifest.version,
        manifest_version: manifest.manifest_version,
        publisher: manifest.publisher,
        description: manifest.description,
        entrypoint: manifest.entrypoint,
        icon_path: manifest.icon_path,
        icon_data_url,
        screenshots,
        screenshot_data_urls,
        homepage_url: manifest.homepage_url,
        support_url: manifest.support_url,
        license: manifest.license,
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

pub fn evaluate_update_feed(
    feed_json: &str,
    current_version: &str,
    machine_arch: &str,
) -> Result<UpdateCheckResult, YambuckError> {
    let feed: UpdateFeed =
        serde_json::from_str(feed_json).map_err(|_| YambuckError::InvalidUpdateFeed)?;

    let latest = parse_version(&feed.version)?;
    let current = parse_version(current_version)?;

    let arch_key = normalize_arch(machine_arch)?;
    let asset = match arch_key {
        "x86_64" => feed.linux.x86_64,
        "aarch64" => feed.linux.aarch64,
        _ => None,
    };

    let update_available = latest > current;
    if update_available && asset.is_none() {
        return Err(YambuckError::InvalidUpdateFeed);
    }

    Ok(UpdateCheckResult {
        current_version: current_version.to_string(),
        latest_version: feed.version,
        update_available,
        channel: feed.channel,
        notes_url: feed.notes_url,
        download_url: asset.as_ref().map(|item| item.url.clone()),
        sha256: asset.as_ref().map(|item| item.sha256.clone()),
    })
}

fn sanitize_trust_status(value: Option<&str>) -> String {
    match value {
        Some("verified") => "verified".to_string(),
        _ => "unverified".to_string(),
    }
}

fn is_supported_manifest_major(version: &str) -> bool {
    let major = version
        .split('.')
        .next()
        .and_then(|segment| segment.parse::<u64>().ok())
        .unwrap_or_default();
    major == 1
}

fn read_archive_file_to_string(
    archive: &mut ZipArchive<fs::File>,
    path: &str,
) -> Result<String, YambuckError> {
    let mut file = archive
        .by_name(path)
        .map_err(|_| YambuckError::InvalidManifest)?;
    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|_| YambuckError::InvalidManifest)?;
    Ok(content)
}

fn read_archive_asset_as_data_url(
    archive: &mut ZipArchive<fs::File>,
    asset_path: &str,
) -> Result<String, YambuckError> {
    let mut file = archive
        .by_name(asset_path)
        .map_err(|_| YambuckError::InvalidManifest)?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)
        .map_err(|_| YambuckError::InvalidManifest)?;

    let mime = mime_for_asset(asset_path);
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{mime};base64,{encoded}"))
}

fn mime_for_asset(path: &str) -> &'static str {
    if path.ends_with(".png") {
        "image/png"
    } else if path.ends_with(".jpg") || path.ends_with(".jpeg") {
        "image/jpeg"
    } else if path.ends_with(".webp") {
        "image/webp"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else {
        "application/octet-stream"
    }
}

fn parse_version(value: &str) -> Result<semver::Version, YambuckError> {
    let normalized = value.trim().trim_start_matches('v');
    semver::Version::parse(normalized).map_err(|_| YambuckError::InvalidUpdateFeed)
}

fn normalize_arch(machine_arch: &str) -> Result<&'static str, YambuckError> {
    match machine_arch {
        "x86_64" | "amd64" => Ok("x86_64"),
        "aarch64" | "arm64" => Ok("aarch64"),
        _ => Err(YambuckError::UnsupportedArchitecture),
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
