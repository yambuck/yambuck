use serde::Deserialize;
use serde_json::Value;

use crate::YambuckError;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PackageManifestV2 {
    pub(crate) manifest_version: String,
}

pub(crate) fn parse_manifest_v2(value: Value) -> Result<PackageManifestV2, YambuckError> {
    let manifest: PackageManifestV2 =
        serde_json::from_value(value).map_err(|_| YambuckError::InvalidManifest)?;

    Err(YambuckError::ManifestVersionNotImplemented(
        manifest.manifest_version,
    ))
}
