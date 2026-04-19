use serde_json::{Map, Value};

use crate::YambuckError;

pub(crate) mod v1;
pub(crate) mod v2;

#[derive(Debug)]
pub(crate) enum ParsedManifest {
    V1(v1::PackageManifestV1),
    V2(v2::PackageManifestV2),
}

const MANIFEST_KEY_STYLE_RULES: [(&str, [&str; 2]); 16] = [
    ("manifestVersion", ["manifest_version", "manifest-version"]),
    ("packageUuid", ["package_uuid", "package-uuid"]),
    ("appId", ["app_id", "app-id"]),
    ("appUuid", ["app_uuid", "app-uuid"]),
    ("displayName", ["display_name", "display-name"]),
    ("longDescription", ["long_description", "long-description"]),
    ("iconPath", ["icon_path", "icon-path"]),
    ("homepageUrl", ["homepage_url", "homepage-url"]),
    ("supportUrl", ["support_url", "support-url"]),
    ("licenseFile", ["license_file", "license-file"]),
    (
        "requiresLicenseAcceptance",
        ["requires_license_acceptance", "requires-license-acceptance"],
    ),
    ("configPath", ["config_path", "config-path"]),
    ("cachePath", ["cache_path", "cache-path"]),
    ("tempPath", ["temp_path", "temp-path"]),
    ("trustStatus", ["trust_status", "trust-status"]),
    (
        "runtimeDependencies",
        ["runtime_dependencies", "runtime-dependencies"],
    ),
];

pub(crate) fn parse_manifest(manifest_content: &str) -> Result<ParsedManifest, YambuckError> {
    let manifest_value: Value =
        serde_json::from_str(manifest_content).map_err(|_| YambuckError::InvalidManifest)?;
    let manifest_object = manifest_value
        .as_object()
        .ok_or(YambuckError::InvalidManifest)?;

    validate_manifest_key_naming(manifest_object)?;

    let manifest_version = extract_manifest_version(manifest_object)?;
    match parse_manifest_major(manifest_version) {
        Some(1) => v1::parse_manifest_v1(manifest_value).map(ParsedManifest::V1),
        Some(2) => v2::parse_manifest_v2(manifest_value).map(ParsedManifest::V2),
        Some(_) => Err(YambuckError::UnsupportedManifestVersion(
            manifest_version.to_string(),
        )),
        None => Err(YambuckError::InvalidManifest),
    }
}

fn validate_manifest_key_naming(manifest_object: &Map<String, Value>) -> Result<(), YambuckError> {
    let mut violations = Vec::new();

    for (canonical_key, non_canonical_keys) in MANIFEST_KEY_STYLE_RULES {
        for non_canonical_key in non_canonical_keys {
            if manifest_object.contains_key(non_canonical_key)
                && !manifest_object.contains_key(canonical_key)
            {
                violations.push(format!("`{non_canonical_key}` -> `{canonical_key}`"));
            }
        }
    }

    if violations.is_empty() {
        return Ok(());
    }

    violations.sort();
    let details = violations.join(", ");
    Err(YambuckError::InvalidManifestFieldNames(format!(
        "manifest uses non-canonical key naming; use camelCase keys only ({details})"
    )))
}

fn extract_manifest_version(manifest_object: &Map<String, Value>) -> Result<&str, YambuckError> {
    manifest_object
        .get("manifestVersion")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or(YambuckError::InvalidManifest)
}

fn parse_manifest_major(version: &str) -> Option<u64> {
    version
        .split('.')
        .next()
        .and_then(|segment| segment.parse::<u64>().ok())
}

#[cfg(test)]
mod tests {
    use super::{parse_manifest, parse_manifest_major};

    #[test]
    fn parses_manifest_major_version() {
        assert_eq!(parse_manifest_major("1.0.0"), Some(1));
        assert_eq!(parse_manifest_major("2.4.9"), Some(2));
        assert_eq!(parse_manifest_major("garbage"), None);
    }

    #[test]
    fn rejects_snake_case_manifest_keys_with_actionable_error() {
        let manifest = r#"{
          "manifest_version": "1.0.0",
          "package_uuid": "pkg-uuid",
          "app_id": "com.example.app"
        }"#;

        let error = parse_manifest(manifest).expect_err("expected key style validation to fail");
        let message = error.to_string();
        assert!(message.contains("camelCase"));
        assert!(message.contains("`manifest_version` -> `manifestVersion`"));
        assert!(message.contains("`package_uuid` -> `packageUuid`"));
        assert!(message.contains("`app_id` -> `appId`"));
    }

    #[test]
    fn rejects_kebab_case_manifest_keys_with_actionable_error() {
        let manifest = r#"{
          "manifest-version": "1.0.0",
          "package-uuid": "pkg-uuid",
          "app-id": "com.example.app"
        }"#;

        let error = parse_manifest(manifest).expect_err("expected key style validation to fail");
        let message = error.to_string();
        assert!(message.contains("`manifest-version` -> `manifestVersion`"));
        assert!(message.contains("`package-uuid` -> `packageUuid`"));
        assert!(message.contains("`app-id` -> `appId`"));
    }
}
