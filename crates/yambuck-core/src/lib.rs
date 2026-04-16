use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use std::fs;
use std::io::Read;
use std::os::unix::fs::PermissionsExt;
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
    pub long_description: Option<String>,
    pub entrypoint: String,
    pub icon_path: String,
    pub icon_data_url: Option<String>,
    pub screenshots: Vec<String>,
    pub screenshot_data_urls: Vec<String>,
    pub homepage_url: Option<String>,
    pub support_url: Option<String>,
    pub license: Option<String>,
    pub license_file: Option<String>,
    pub license_text: Option<String>,
    pub requires_license_acceptance: bool,
    pub config_path: Option<String>,
    pub cache_path: Option<String>,
    pub temp_path: Option<String>,
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
    pub icon_data_url: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledAppDetails {
    pub app_id: String,
    pub display_name: String,
    pub version: String,
    pub install_scope: InstallScope,
    pub installed_at: String,
    pub package_info: PackageInfo,
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
    #[serde(default)]
    entrypoint: String,
    #[serde(default)]
    package_archive_path: Option<String>,
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
    long_description: Option<String>,
    version: String,
    publisher: String,
    entrypoint: String,
    icon_path: String,
    screenshots: Option<Vec<String>>,
    homepage_url: Option<String>,
    support_url: Option<String>,
    license: Option<String>,
    license_file: Option<String>,
    requires_license_acceptance: Option<bool>,
    config_path: Option<String>,
    cache_path: Option<String>,
    temp_path: Option<String>,
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
    MetadataUnavailable,
    InvalidUpdateFeed,
    UnsupportedArchitecture,
    InstallFailed,
    LaunchFailed,
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
            YambuckError::MetadataUnavailable => {
                formatter.write_str("installed app metadata unavailable")
            }
            YambuckError::InvalidUpdateFeed => formatter.write_str("invalid update feed"),
            YambuckError::UnsupportedArchitecture => {
                formatter.write_str("unsupported system architecture")
            }
            YambuckError::InstallFailed => formatter.write_str("install failed"),
            YambuckError::LaunchFailed => formatter.write_str("launch failed"),
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
        .take(6)
        .filter_map(|path| read_archive_asset_as_data_url(&mut archive, path).ok())
        .collect::<Vec<String>>();

    let trust_status = sanitize_trust_status(manifest.trust_status.as_deref());
    let long_description = manifest.long_description.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });
    let license_file = sanitize_optional_text(manifest.license_file);
    let license_text = match license_file.as_ref() {
        Some(path) => {
            let raw_license_text = read_archive_file_to_string(&mut archive, path)?;
            let trimmed = raw_license_text.trim().to_string();
            if trimmed.is_empty() {
                return Err(YambuckError::InvalidManifest);
            }
            Some(trimmed)
        }
        None => None,
    };
    let requires_license_acceptance = manifest.requires_license_acceptance.unwrap_or(false);
    if requires_license_acceptance && license_text.is_none() {
        return Err(YambuckError::InvalidManifest);
    }
    let config_path = sanitize_optional_text(manifest.config_path);
    let cache_path = sanitize_optional_text(manifest.cache_path);
    let temp_path = sanitize_optional_text(manifest.temp_path);

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
        long_description,
        entrypoint: manifest.entrypoint,
        icon_path: manifest.icon_path,
        icon_data_url,
        screenshots,
        screenshot_data_urls,
        homepage_url: manifest.homepage_url,
        support_url: manifest.support_url,
        license: manifest.license,
        license_file,
        license_text,
        requires_license_acceptance,
        config_path,
        cache_path,
        temp_path,
        package_uuid: manifest.package_uuid,
        trust_status,
    })
}

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

pub fn list_installed_apps() -> Vec<InstalledApp> {
    let mut apps = Vec::new();
    for scope in [InstallScope::User, InstallScope::System] {
        if let Ok(records) = read_index(scope) {
            apps.extend(records.into_iter().map(|record| {
                let icon_data_url = record
                    .package_archive_path
                    .as_ref()
                    .and_then(|archive_path| inspect_package(archive_path).ok())
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

    let package_info = inspect_package(&archive_path)?;
    Ok(InstalledAppDetails {
        app_id: record.app_id,
        display_name: record.display_name,
        version: record.version,
        install_scope: record.install_scope,
        installed_at: record.installed_at,
        package_info,
    })
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

        let mut removed_record: Option<InstalledAppRecord> = None;
        records.retain(|record| {
            if record.app_id == app_id {
                removed_record = Some(record.clone());
                false
            } else {
                true
            }
        });

        if let Some(record) = removed_record {
            write_index(scope, &records)?;
            removed_any = true;
            let _ = maybe_remove_package_archive(record.package_archive_path.as_deref());
            if remove_user_data {
                let _ = maybe_remove_app_data(&record.destination_path);
            }
        }
    }

    if !removed_any {
        return Err(YambuckError::AppNotInstalled);
    }

    Ok(())
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

fn sanitize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
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

fn find_installed_record(app_id: &str) -> Option<InstalledAppRecord> {
    [InstallScope::User, InstallScope::System]
        .into_iter()
        .filter_map(|scope| read_index(scope).ok())
        .flatten()
        .find(|record| record.app_id == app_id)
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

fn archive_package_file(
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

fn package_archive_root(scope: InstallScope) -> Result<PathBuf, YambuckError> {
    match scope {
        InstallScope::User => {
            let home = std::env::var("HOME").map_err(|_| YambuckError::StorageUnavailable)?;
            Ok(PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("yambuck")
                .join("package-archives"))
        }
        InstallScope::System => Ok(PathBuf::from("/var/lib/yambuck/package-archives")),
    }
}

fn maybe_remove_package_archive(path: Option<&str>) -> Result<(), YambuckError> {
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

fn current_unix_timestamp() -> String {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    duration.as_secs().to_string()
}
