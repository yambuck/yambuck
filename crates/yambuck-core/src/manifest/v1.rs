use serde::Deserialize;
use serde_json::Value;

use crate::YambuckError;

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
    pub(crate) entrypoint: String,
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
}

pub(crate) fn parse_manifest_v1(value: Value) -> Result<PackageManifestV1, YambuckError> {
    serde_json::from_value(value).map_err(|_| YambuckError::InvalidManifest)
}
