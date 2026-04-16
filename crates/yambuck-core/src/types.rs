use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

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
pub struct UninstallResult {
    pub app_id: String,
    pub install_scope: InstallScope,
    pub removed_app_files: bool,
    pub removed_user_data: bool,
    pub warnings: Vec<String>,
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
