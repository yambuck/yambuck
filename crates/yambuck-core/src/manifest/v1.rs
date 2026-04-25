use serde::Deserialize;
use serde_json::Value;

use crate::YambuckError;

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PackageInterfacesV1 {
    pub(crate) gui: Option<InterfaceModeV1>,
    pub(crate) cli: Option<CliInterfaceModeV1>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InterfaceModeV1 {
    pub(crate) enabled: Option<bool>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CliInterfaceModeV1 {
    pub(crate) enabled: Option<bool>,
    pub(crate) command_name: Option<String>,
    pub(crate) usage_hint: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TargetEntrypointsV1 {
    pub(crate) gui: Option<String>,
    pub(crate) cli: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LinuxTargetSupportV1 {
    pub(crate) desktop_environments: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PackageTargetV1 {
    pub(crate) id: String,
    pub(crate) os: String,
    pub(crate) arch: String,
    pub(crate) variant: Option<String>,
    pub(crate) payload_root: String,
    pub(crate) entrypoints: TargetEntrypointsV1,
    pub(crate) linux: Option<LinuxTargetSupportV1>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PackageManifestV1 {
    pub(crate) manifest_version: String,
    pub(crate) package_uuid: String,
    pub(crate) app_id: String,
    pub(crate) app_uuid: String,
    pub(crate) display_name: String,
    pub(crate) description: String,
    pub(crate) long_description: Option<String>,
    pub(crate) version: String,
    pub(crate) publisher: String,
    pub(crate) icon_path: String,
    pub(crate) screenshots: Option<Vec<String>>,
    pub(crate) homepage_url: Option<String>,
    pub(crate) support_url: Option<String>,
    pub(crate) license: Option<String>,
    pub(crate) license_file: Option<String>,
    pub(crate) requires_license_acceptance: Option<bool>,
    pub(crate) config_path: Option<String>,
    pub(crate) cache_path: Option<String>,
    pub(crate) temp_path: Option<String>,
    pub(crate) trust_status: Option<String>,
    pub(crate) interfaces: Option<PackageInterfacesV1>,
    pub(crate) targets: Option<Vec<PackageTargetV1>>,
}

pub(crate) fn parse_manifest_v1(value: Value) -> Result<PackageManifestV1, YambuckError> {
    serde_json::from_value(value).map_err(|_| YambuckError::InvalidManifest)
}
