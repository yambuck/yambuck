//! Evaluates a v1 manifest's runtime dependency checks against this host.

use std::env;
use std::fs;
use std::path::Path;

use super::HOST_OS;
use crate::RuntimeDependencyIssue;

pub(super) fn evaluate_runtime_dependency_checks(
    runtime_dependencies: Option<&crate::manifest::v1::RuntimeDependenciesV1>,
) -> Vec<RuntimeDependencyIssue> {
    let Some(dependencies) = runtime_dependencies else {
        return Vec::new();
    };

    let _strategy = match dependencies.strategy {
        crate::manifest::v1::RuntimeDependencyStrategyV1::BundleFirst => "bundleFirst",
        crate::manifest::v1::RuntimeDependencyStrategyV1::HostRequired => "hostRequired",
    };

    let mut issues = Vec::new();
    for check in &dependencies.checks {
        if !runtime_check_applies_to_host(check.applies_to.as_ref()) {
            continue;
        }

        match check.check_type {
            crate::manifest::v1::RuntimeDependencyCheckTypeV1::Command => {
                let name = check.name.as_deref().unwrap_or_default();
                if let Some(issue) = evaluate_command_check(check, name) {
                    issues.push(issue);
                }
            }
            crate::manifest::v1::RuntimeDependencyCheckTypeV1::File => {
                let path = check.path.as_deref().unwrap_or_default();
                if let Some(issue) = evaluate_file_check(check, path, check.must_be_executable) {
                    issues.push(issue);
                }
            }
        }
    }

    issues
}

pub(super) fn runtime_check_applies_to_host(
    applies_to: Option<&crate::manifest::v1::RuntimeDependencyAppliesToV1>,
) -> bool {
    let Some(filter) = applies_to else {
        return true;
    };

    let Some(os) = filter.os else {
        return true;
    };

    let expected_os = match os {
        crate::manifest::v1::RuntimeDependencyOsV1::Linux => "linux",
        crate::manifest::v1::RuntimeDependencyOsV1::Windows => "windows",
        crate::manifest::v1::RuntimeDependencyOsV1::Macos => "macos",
    };

    expected_os == HOST_OS
}

pub(super) fn evaluate_command_check(
    check: &crate::manifest::v1::RuntimeDependencyCheckV1,
    command_name: &str,
) -> Option<RuntimeDependencyIssue> {
    if resolve_command_path(command_name).is_some() {
        return None;
    }

    Some(RuntimeDependencyIssue {
        id: check.id.clone(),
        check_type: "command".to_string(),
        severity: runtime_severity_label(check.severity).to_string(),
        reason_code: "missing_runtime_dependency".to_string(),
        message: check.message.clone().unwrap_or_else(|| {
            format!("Required command `{command_name}` is not available on this system.")
        }),
        technical_hint: check.technical_hint.clone(),
        technical_details: Some(format!(
            "Command probe failed: `{command_name}` was not found in PATH."
        )),
    })
}

pub(super) fn evaluate_file_check(
    check: &crate::manifest::v1::RuntimeDependencyCheckV1,
    path: &str,
    must_be_executable: Option<bool>,
) -> Option<RuntimeDependencyIssue> {
    let file_path = Path::new(path);
    if !file_path.exists() {
        return Some(RuntimeDependencyIssue {
            id: check.id.clone(),
            check_type: "file".to_string(),
            severity: runtime_severity_label(check.severity).to_string(),
            reason_code: "missing_runtime_dependency".to_string(),
            message: check
                .message
                .clone()
                .unwrap_or_else(|| format!("Required file `{path}` is missing on this system.")),
            technical_hint: check.technical_hint.clone(),
            technical_details: Some(format!("File probe failed: `{path}` does not exist.")),
        });
    }

    if must_be_executable.unwrap_or(false) {
        match file_path.metadata() {
            Ok(metadata) => {
                if !is_metadata_executable(&metadata) {
                    return Some(RuntimeDependencyIssue {
                        id: check.id.clone(),
                        check_type: "file".to_string(),
                        severity: runtime_severity_label(check.severity).to_string(),
                        reason_code: "runtime_dependency_misconfigured".to_string(),
                        message: check.message.clone().unwrap_or_else(|| {
                            format!(
                                "Required file `{path}` exists but is not executable on this system."
                            )
                        }),
                        technical_hint: check.technical_hint.clone(),
                        technical_details: Some(format!(
                            "File probe failed: `{path}` does not satisfy executable requirement."
                        )),
                    });
                }
            }
            Err(error) => {
                return Some(RuntimeDependencyIssue {
                    id: check.id.clone(),
                    check_type: "file".to_string(),
                    severity: runtime_severity_label(check.severity).to_string(),
                    reason_code: "runtime_dependency_check_failed".to_string(),
                    message: check.message.clone().unwrap_or_else(|| {
                        format!("Could not verify required file `{path}` on this system.")
                    }),
                    technical_hint: check.technical_hint.clone(),
                    technical_details: Some(format!(
                        "File probe failed while reading metadata for `{path}`: {error}"
                    )),
                });
            }
        }
    }

    None
}

pub(super) fn resolve_command_path(command_name: &str) -> Option<std::path::PathBuf> {
    let candidate = Path::new(command_name);
    if candidate.components().count() > 1 {
        return candidate
            .is_file()
            .then(|| candidate.to_path_buf())
            .filter(|path| is_executable_path(path));
    }

    let path_value = env::var_os("PATH")?;
    for directory in env::split_paths(&path_value) {
        let direct_candidate = directory.join(command_name);
        if direct_candidate.is_file() && is_executable_path(&direct_candidate) {
            return Some(direct_candidate);
        }

        #[cfg(windows)]
        {
            if let Some(extensions) = env::var_os("PATHEXT") {
                for extension in extensions
                    .to_string_lossy()
                    .split(';')
                    .map(|value| value.trim())
                    .filter(|value| !value.is_empty())
                {
                    let ext = extension.trim_start_matches('.');
                    let extended_candidate = directory.join(format!("{command_name}.{ext}"));
                    if extended_candidate.is_file() {
                        return Some(extended_candidate);
                    }
                }
            }
        }
    }

    None
}

pub(super) fn runtime_severity_label(
    severity: crate::manifest::v1::RuntimeDependencySeverityV1,
) -> &'static str {
    match severity {
        crate::manifest::v1::RuntimeDependencySeverityV1::Block => "block",
        crate::manifest::v1::RuntimeDependencySeverityV1::Warn => "warn",
    }
}

#[cfg(unix)]
pub(super) fn is_metadata_executable(metadata: &fs::Metadata) -> bool {
    use std::os::unix::fs::PermissionsExt;
    metadata.permissions().mode() & 0o111 != 0
}

#[cfg(not(unix))]
pub(super) fn is_metadata_executable(_metadata: &fs::Metadata) -> bool {
    true
}

pub(super) fn is_executable_path(path: &Path) -> bool {
    match path.metadata() {
        Ok(metadata) => is_metadata_executable(&metadata),
        Err(_) => false,
    }
}
