use serde::Deserialize;
use serde_json::Value;
use std::collections::HashSet;

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
    pub(crate) runtime_dependencies: Option<RuntimeDependenciesV1>,
    pub(crate) interfaces: Option<PackageInterfacesV1>,
    pub(crate) targets: Option<Vec<PackageTargetV1>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RuntimeDependenciesV1 {
    pub(crate) strategy: RuntimeDependencyStrategyV1,
    pub(crate) checks: Vec<RuntimeDependencyCheckV1>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum RuntimeDependencyStrategyV1 {
    BundleFirst,
    HostRequired,
}

#[derive(Debug, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub(crate) enum RuntimeDependencySeverityV1 {
    Block,
    Warn,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RuntimeDependencyCheckV1 {
    pub(crate) id: String,
    #[serde(rename = "type")]
    pub(crate) check_type: RuntimeDependencyCheckTypeV1,
    pub(crate) severity: RuntimeDependencySeverityV1,
    pub(crate) name: Option<String>,
    pub(crate) path: Option<String>,
    pub(crate) must_be_executable: Option<bool>,
    pub(crate) message: Option<String>,
    pub(crate) technical_hint: Option<String>,
    pub(crate) applies_to: Option<RuntimeDependencyAppliesToV1>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RuntimeDependencyAppliesToV1 {
    pub(crate) os: Option<RuntimeDependencyOsV1>,
}

#[derive(Debug, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum RuntimeDependencyOsV1 {
    Linux,
    Windows,
    Macos,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum RuntimeDependencyCheckTypeV1 {
    Command,
    File,
}

pub(crate) fn parse_manifest_v1(value: Value) -> Result<PackageManifestV1, YambuckError> {
    let manifest: PackageManifestV1 =
        serde_json::from_value(value).map_err(|_| YambuckError::InvalidManifest)?;
    validate_runtime_dependencies(manifest.runtime_dependencies.as_ref())?;
    Ok(manifest)
}

fn validate_runtime_dependencies(
    runtime_dependencies: Option<&RuntimeDependenciesV1>,
) -> Result<(), YambuckError> {
    let Some(dependencies) = runtime_dependencies else {
        return Ok(());
    };

    if dependencies.checks.is_empty() {
        return Err(YambuckError::InvalidManifestDetails(
            "`runtimeDependencies.checks` must include at least one dependency check".to_string(),
        ));
    }

    if dependencies.checks.len() > 32 {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`runtimeDependencies.checks` includes {} entries; maximum allowed is 32",
            dependencies.checks.len()
        )));
    }

    let mut seen_ids = HashSet::<String>::new();
    for check in &dependencies.checks {
        let id = check.id.trim();
        if id.is_empty() {
            return Err(YambuckError::InvalidManifestDetails(
                "`runtimeDependencies.checks[].id` is required and must be non-empty".to_string(),
            ));
        }

        if !is_kebab_case_id(id) {
            return Err(YambuckError::InvalidManifestDetails(format!(
                "`runtimeDependencies.checks[].id` must be kebab-case (received `{id}`)"
            )));
        }

        if !seen_ids.insert(id.to_string()) {
            return Err(YambuckError::InvalidManifestDetails(format!(
                "`runtimeDependencies.checks` contains duplicate id `{id}`"
            )));
        }

        if let Some(message) = check.message.as_deref() {
            if message.trim().is_empty() {
                return Err(YambuckError::InvalidManifestDetails(format!(
                    "`runtimeDependencies.checks[].message` must be non-empty when provided (check `{id}`)"
                )));
            }
        }

        if let Some(hint) = check.technical_hint.as_deref() {
            if hint.trim().is_empty() {
                return Err(YambuckError::InvalidManifestDetails(format!(
                    "`runtimeDependencies.checks[].technicalHint` must be non-empty when provided (check `{id}`)"
                )));
            }
        }

        match check.check_type {
            RuntimeDependencyCheckTypeV1::Command => {
                let Some(name) = check.name.as_deref() else {
                    return Err(YambuckError::InvalidManifestDetails(format!(
                        "`runtimeDependencies.checks[].name` is required for command checks (check `{id}`)"
                    )));
                };
                if name.trim().is_empty() {
                    return Err(YambuckError::InvalidManifestDetails(format!(
                        "`runtimeDependencies.checks[].name` is required for command checks (check `{id}`)"
                    )));
                }

                if check.path.is_some() || check.must_be_executable.is_some() {
                    return Err(YambuckError::InvalidManifestDetails(format!(
                        "`runtimeDependencies.checks[]` command checks must not include file-only fields (check `{id}`)"
                    )));
                }
            }
            RuntimeDependencyCheckTypeV1::File => {
                let Some(path) = check.path.as_deref() else {
                    return Err(YambuckError::InvalidManifestDetails(format!(
                        "`runtimeDependencies.checks[].path` is required for file checks (check `{id}`)"
                    )));
                };
                let trimmed = path.trim();
                if trimmed.is_empty() {
                    return Err(YambuckError::InvalidManifestDetails(format!(
                        "`runtimeDependencies.checks[].path` is required for file checks (check `{id}`)"
                    )));
                }

                if !trimmed.starts_with('/') {
                    return Err(YambuckError::InvalidManifestDetails(format!(
                        "`runtimeDependencies.checks[].path` must be an absolute host path (check `{id}`)"
                    )));
                }

                if check.name.is_some() {
                    return Err(YambuckError::InvalidManifestDetails(format!(
                        "`runtimeDependencies.checks[]` file checks must not include command-only fields (check `{id}`)"
                    )));
                }
            }
        }
    }

    Ok(())
}

fn is_kebab_case_id(value: &str) -> bool {
    if value.starts_with('-') || value.ends_with('-') || value.contains("--") {
        return false;
    }

    value
        .chars()
        .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-')
}

#[cfg(test)]
mod tests {
    use super::parse_manifest_v1;
    use serde_json::json;

    fn base_manifest() -> serde_json::Value {
        json!({
            "manifestVersion": "1.0.0",
            "packageUuid": "11111111-1111-4111-8111-111111111111",
            "appId": "com.example.app",
            "appUuid": "22222222-2222-4222-8222-222222222222",
            "displayName": "Example App",
            "description": "Example description",
            "version": "1.0.0",
            "publisher": "Example Publisher",
            "iconPath": "assets/icon.png"
        })
    }

    #[test]
    fn accepts_valid_runtime_dependency_command_check() {
        let mut manifest = base_manifest();
        manifest["runtimeDependencies"] = json!({
            "strategy": "bundleFirst",
            "checks": [
                {
                    "id": "xdg-open",
                    "type": "command",
                    "name": "xdg-open",
                    "severity": "warn",
                    "message": "Open-link integration may be limited."
                }
            ]
        });

        let result = parse_manifest_v1(manifest);
        assert!(
            result.is_ok(),
            "expected runtime dependency manifest to parse"
        );
    }

    #[test]
    fn rejects_duplicate_runtime_dependency_ids() {
        let mut manifest = base_manifest();
        manifest["runtimeDependencies"] = json!({
            "strategy": "bundleFirst",
            "checks": [
                {
                    "id": "portal-service",
                    "type": "command",
                    "name": "xdg-desktop-portal",
                    "severity": "block"
                },
                {
                    "id": "portal-service",
                    "type": "file",
                    "path": "/usr/share/dbus-1/services/org.freedesktop.portal.Desktop.service",
                    "severity": "warn"
                }
            ]
        });

        let error = parse_manifest_v1(manifest).expect_err("expected duplicate id error");
        assert!(error
            .to_string()
            .contains("contains duplicate id `portal-service`"));
    }

    #[test]
    fn rejects_non_absolute_file_runtime_dependency_path() {
        let mut manifest = base_manifest();
        manifest["runtimeDependencies"] = json!({
            "strategy": "hostRequired",
            "checks": [
                {
                    "id": "portal-service",
                    "type": "file",
                    "path": "usr/share/dbus-1/services/org.freedesktop.portal.Desktop.service",
                    "severity": "block"
                }
            ]
        });

        let error = parse_manifest_v1(manifest).expect_err("expected absolute path error");
        assert!(error.to_string().contains("must be an absolute host path"));
    }
}
