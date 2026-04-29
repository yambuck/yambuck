use base64::Engine;
use image::ImageFormat;
use std::collections::HashSet;
use std::env;
use std::fs;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

use crate::manifest::{self, ParsedManifest};
use crate::{
    AppInterface, CompatibilityReason, InstallOptionDefinition, InstallWizardStep, InstallWorkflow,
    PackageInfo, RuntimeDependencyIssue, YambuckError,
};

const ICON_MIN_WIDTH: u32 = 128;
const ICON_MIN_HEIGHT: u32 = 128;
const SCREENSHOT_MIN_WIDTH: u32 = 256;
const SCREENSHOT_MIN_HEIGHT: u32 = 256;
const SCREENSHOT_MIN_ASPECT_RATIO: f32 = 0.4;
const SCREENSHOT_MAX_ASPECT_RATIO: f32 = 2.5;
const ICON_MIN_BYTES: usize = 512;
const SCREENSHOT_MIN_BYTES: usize = 1024;
const HOST_OS: &str = std::env::consts::OS;
const HOST_ARCH: &str = std::env::consts::ARCH;

struct ResolvedInterface {
    has_gui: bool,
    has_cli: bool,
    cli_command_name: Option<String>,
    cli_usage_hint: Option<String>,
}

struct SelectedTarget {
    id: Option<String>,
    payload_root: Option<String>,
    entrypoint: Option<String>,
    compatibility_status: String,
    compatibility_reasons: Vec<CompatibilityReason>,
}

#[derive(Copy, Clone)]
enum AssetKind {
    Icon,
    Screenshot(usize),
}

pub fn inspect_package(package_file: &str) -> Result<PackageInfo, YambuckError> {
    inspect_package_workflow(package_file).map(|workflow| workflow.package_info)
}

pub fn inspect_package_workflow(package_file: &str) -> Result<InstallWorkflow, YambuckError> {
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
    let parsed_manifest = manifest::parse_manifest(&manifest_content)?;

    match parsed_manifest {
        ParsedManifest::V1(manifest_v1) => {
            let package_info =
                inspect_manifest_v1(package_file, file_name, manifest_v1, &mut archive)?;
            Ok(InstallWorkflow {
                manifest_major: 1,
                wizard_steps: build_v1_wizard_steps(&package_info),
                package_info,
                install_options: Vec::<InstallOptionDefinition>::new(),
            })
        }
        ParsedManifest::V2(manifest_v2) => Err(YambuckError::ManifestVersionNotImplemented(
            manifest_v2.manifest_version,
        )),
    }
}

pub fn evaluate_runtime_dependency_issues(
    package_file: &str,
) -> Result<Vec<RuntimeDependencyIssue>, YambuckError> {
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
    let parsed_manifest = manifest::parse_manifest(&manifest_content)?;

    match parsed_manifest {
        ParsedManifest::V1(manifest_v1) => Ok(evaluate_runtime_dependency_checks(
            manifest_v1.runtime_dependencies.as_ref(),
        )),
        ParsedManifest::V2(manifest_v2) => Err(YambuckError::ManifestVersionNotImplemented(
            manifest_v2.manifest_version,
        )),
    }
}

fn inspect_manifest_v1(
    package_file: &str,
    file_name: &str,
    manifest: crate::manifest::v1::PackageManifestV1,
    archive: &mut ZipArchive<fs::File>,
) -> Result<PackageInfo, YambuckError> {
    let app_id = require_non_empty_manifest_text("appId", &manifest.app_id)?;
    let app_uuid = require_non_empty_manifest_text("appUuid", &manifest.app_uuid)?;
    let display_name = require_non_empty_manifest_text("displayName", &manifest.display_name)?;
    let description = require_non_empty_manifest_text("description", &manifest.description)?;
    let version = require_non_empty_manifest_text("version", &manifest.version)?;
    let publisher = require_non_empty_manifest_text("publisher", &manifest.publisher)?;
    let icon_path = require_non_empty_manifest_text("iconPath", &manifest.icon_path)?;
    let manifest_version =
        require_non_empty_manifest_text("manifestVersion", &manifest.manifest_version)?;
    let package_uuid = require_non_empty_manifest_text("packageUuid", &manifest.package_uuid)?;
    let long_description = require_non_empty_optional_manifest_text(
        "longDescription",
        manifest.long_description.as_deref(),
    )?;
    let screenshots = validate_required_screenshots(manifest.screenshots.as_ref())?;

    validate_image_asset(archive, &icon_path, AssetKind::Icon)?;
    let icon_data_url = Some(read_archive_asset_as_data_url(
        archive,
        &icon_path,
        AssetKind::Icon,
    )?);

    let mut screenshot_data_urls = Vec::with_capacity(screenshots.len());
    for (index, path) in screenshots.iter().enumerate() {
        validate_image_asset(archive, path, AssetKind::Screenshot(index))?;
        screenshot_data_urls.push(read_archive_asset_as_data_url(
            archive,
            path,
            AssetKind::Screenshot(index),
        )?);
    }

    let trust_status = sanitize_trust_status(manifest.trust_status.as_deref());
    let license_file = manifest
        .license_file
        .as_ref()
        .and_then(|value| sanitize_non_empty_text(value));
    let license_text = match license_file.as_ref() {
        Some(path) => {
            let raw_license_text = read_archive_file_to_string(archive, path).map_err(|_| {
                YambuckError::InvalidManifestDetails(format!(
                    "`licenseFile` references a missing or unreadable file: `{path}`"
                ))
            })?;
            let trimmed = raw_license_text.trim().to_string();
            if trimmed.is_empty() {
                return Err(YambuckError::InvalidManifestDetails(
                    "`licenseFile` must contain non-empty text when provided".to_string(),
                ));
            }
            Some(trimmed)
        }
        None => None,
    };
    let requires_license_acceptance = manifest.requires_license_acceptance.unwrap_or(false);
    if requires_license_acceptance && license_text.is_none() {
        return Err(YambuckError::InvalidManifestDetails(
            "`requiresLicenseAcceptance` is true, but no non-empty `licenseFile` text is available"
                .to_string(),
        ));
    }

    let resolved_interface = resolve_interface_modes(manifest.interfaces.as_ref())?;
    let selected_target =
        resolve_target_for_host(archive, manifest.targets.as_ref(), &resolved_interface)?;

    Ok(PackageInfo {
        package_file: package_file.to_string(),
        file_name: file_name.to_string(),
        display_name,
        app_id,
        app_uuid,
        version,
        manifest_version,
        publisher,
        description,
        long_description: Some(long_description),
        entrypoint: selected_target.entrypoint.unwrap_or_default(),
        icon_path,
        icon_data_url,
        screenshots,
        screenshot_data_urls,
        homepage_url: manifest.homepage_url,
        support_url: manifest.support_url,
        license: manifest.license,
        license_file,
        license_text,
        requires_license_acceptance,
        config_path: manifest
            .config_path
            .as_ref()
            .and_then(|value| sanitize_non_empty_text(value)),
        cache_path: manifest
            .cache_path
            .as_ref()
            .and_then(|value| sanitize_non_empty_text(value)),
        temp_path: manifest
            .temp_path
            .as_ref()
            .and_then(|value| sanitize_non_empty_text(value)),
        package_uuid,
        trust_status,
        app_interface: AppInterface {
            has_gui: resolved_interface.has_gui,
            has_cli: resolved_interface.has_cli,
        },
        cli_command_name: resolved_interface.cli_command_name,
        cli_usage_hint: resolved_interface.cli_usage_hint,
        selected_target_id: selected_target.id,
        payload_root: selected_target.payload_root,
        compatibility_status: selected_target.compatibility_status,
        compatibility_reasons: selected_target.compatibility_reasons,
    })
}

fn require_non_empty_manifest_text(field_name: &str, value: &str) -> Result<String, YambuckError> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` is required and must be non-empty"
        )));
    }
    Ok(trimmed)
}

fn require_non_empty_optional_manifest_text(
    field_name: &str,
    value: Option<&str>,
) -> Result<String, YambuckError> {
    let text = value.ok_or_else(|| {
        YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` is required and must be non-empty"
        ))
    })?;
    require_non_empty_manifest_text(field_name, text)
}

fn validate_required_screenshots(
    screenshots: Option<&Vec<String>>,
) -> Result<Vec<String>, YambuckError> {
    let screenshot_list = screenshots.ok_or_else(|| {
        YambuckError::InvalidManifestDetails(
            "`screenshots` is required and must include between 1 and 6 image paths".to_string(),
        )
    })?;

    if screenshot_list.is_empty() {
        return Err(YambuckError::InvalidManifestDetails(
            "`screenshots` must include at least 1 image path".to_string(),
        ));
    }

    if screenshot_list.len() > 6 {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`screenshots` includes {} entries; maximum allowed is 6",
            screenshot_list.len()
        )));
    }

    let mut sanitized = Vec::with_capacity(screenshot_list.len());
    for (index, path) in screenshot_list.iter().enumerate() {
        let field_name = format!("screenshots[{index}]");
        sanitized.push(require_non_empty_manifest_text(&field_name, path)?);
    }
    Ok(sanitized)
}

fn build_v1_wizard_steps(package_info: &PackageInfo) -> Vec<InstallWizardStep> {
    let mut steps = vec![InstallWizardStep::Details, InstallWizardStep::Trust];
    if package_info.requires_license_acceptance {
        steps.push(InstallWizardStep::License);
    }
    steps.extend([
        InstallWizardStep::Scope,
        InstallWizardStep::Progress,
        InstallWizardStep::Complete,
    ]);
    steps
}

fn sanitize_non_empty_text(value: &str) -> Option<String> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}

fn sanitize_trust_status(value: Option<&str>) -> String {
    match value {
        Some("verified") => "verified".to_string(),
        _ => "unverified".to_string(),
    }
}

fn resolve_interface_modes(
    interfaces: Option<&crate::manifest::v1::PackageInterfacesV1>,
) -> Result<ResolvedInterface, YambuckError> {
    let Some(interface_modes) = interfaces else {
        return Ok(ResolvedInterface {
            has_gui: true,
            has_cli: false,
            cli_command_name: None,
            cli_usage_hint: None,
        });
    };

    let gui_enabled = interface_modes
        .gui
        .as_ref()
        .and_then(|mode| mode.enabled)
        .unwrap_or(false);
    let cli_enabled = interface_modes
        .cli
        .as_ref()
        .and_then(|mode| mode.enabled)
        .unwrap_or(false);

    if !gui_enabled && !cli_enabled {
        return Err(YambuckError::InvalidManifestDetails(
            "`interfaces` must enable at least one mode (`gui` or `cli`)".to_string(),
        ));
    }

    Ok(ResolvedInterface {
        has_gui: gui_enabled,
        has_cli: cli_enabled,
        cli_command_name: interface_modes
            .cli
            .as_ref()
            .and_then(|mode| mode.command_name.as_deref())
            .and_then(sanitize_non_empty_text),
        cli_usage_hint: interface_modes
            .cli
            .as_ref()
            .and_then(|mode| mode.usage_hint.as_deref())
            .and_then(sanitize_non_empty_text),
    })
}

fn resolve_target_for_host(
    archive: &mut ZipArchive<fs::File>,
    targets: Option<&Vec<crate::manifest::v1::PackageTargetV1>>,
    interface_modes: &ResolvedInterface,
) -> Result<SelectedTarget, YambuckError> {
    let target_list = targets.ok_or_else(|| {
        YambuckError::InvalidManifestDetails(
            "`targets` is required and must include at least one target object".to_string(),
        )
    })?;

    if target_list.is_empty() {
        return Err(YambuckError::InvalidManifestDetails(
            "`targets` must include at least one target object".to_string(),
        ));
    }

    let mut seen = HashSet::<String>::new();
    let host_desktop = detect_host_desktop_environment();
    let mut host_matches = Vec::new();
    let mut host_messages = Vec::new();

    for target in target_list {
        let target_id = require_non_empty_manifest_text("targets[].id", &target.id)?;
        let os = normalize_target_os(&target.os)?;
        let arch = normalize_target_arch(&target.arch)?;
        let variant = normalize_variant(target.variant.as_deref());
        let key = format!("{os}/{arch}/{variant}");
        if !seen.insert(key.clone()) {
            return Err(YambuckError::InvalidManifestDetails(format!(
                "`targets` includes duplicate os/arch/variant combination: {key}"
            )));
        }

        let payload_root = require_non_empty_manifest_text("payloadRoot", &target.payload_root)?;
        validate_payload_root_format(&payload_root)?;
        validate_archive_directory_exists(archive, &payload_root, "payloadRoot")?;

        if os != HOST_OS {
            host_messages.push(format!(
                "target `{}` is for os `{os}` but host is `{}`",
                target_id, HOST_OS
            ));
            continue;
        }

        if arch != HOST_ARCH {
            host_messages.push(format!(
                "target `{}` is for arch `{arch}` but host is `{}`",
                target_id, HOST_ARCH
            ));
            continue;
        }

        if os == "linux" && interface_modes.has_gui {
            let allowed_desktops = normalize_linux_desktops(target.linux.as_ref())?;
            if !allowed_desktops.is_empty() {
                let Some(host_desktop_name) = host_desktop.as_deref() else {
                    host_messages.push(format!(
                        "target `{}` requires desktop environment support {:?}, but host desktop environment could not be detected",
                        target_id, allowed_desktops
                    ));
                    continue;
                };
                if !allowed_desktops
                    .iter()
                    .any(|value| value == host_desktop_name)
                {
                    host_messages.push(format!(
                        "target `{}` supports {:?}, but host desktop environment is `{host_desktop_name}`",
                        target_id, allowed_desktops
                    ));
                    continue;
                }
            }
        }

        let entrypoint = resolve_target_entrypoint(target, interface_modes)?;
        validate_safe_relative_path("entrypoints", &entrypoint)?;
        let target_entrypoint = format!("{}/{}", payload_root.trim_end_matches('/'), entrypoint);
        validate_archive_file_exists(archive, &target_entrypoint, "entrypoints")?;
        host_matches.push(SelectedTarget {
            id: Some(target_id),
            payload_root: Some(payload_root),
            entrypoint: Some(entrypoint),
            compatibility_status: "supported".to_string(),
            compatibility_reasons: Vec::new(),
        });
    }

    if host_matches.is_empty() {
        let mut reasons = Vec::new();
        for detail in host_messages {
            if detail.contains("host desktop environment could not be detected") {
                reasons.push(CompatibilityReason {
                    code: "desktop_environment_not_detected".to_string(),
                    message:
                        "Sorry, we could not detect your desktop environment to validate this app."
                            .to_string(),
                    technical_details: Some(detail),
                });
            } else if detail.contains("host desktop environment") {
                reasons.push(CompatibilityReason {
                    code: "unsupported_desktop_environment".to_string(),
                    message: "This app does not support your current desktop environment/session."
                        .to_string(),
                    technical_details: Some(detail),
                });
            } else if detail.contains("is for arch") {
                reasons.push(CompatibilityReason {
                    code: "unsupported_architecture".to_string(),
                    message: "This app does not support your system architecture.".to_string(),
                    technical_details: Some(detail),
                });
            } else if detail.contains("is for os") {
                reasons.push(CompatibilityReason {
                    code: "unsupported_operating_system".to_string(),
                    message: "This app does not support your operating system.".to_string(),
                    technical_details: Some(detail),
                });
            } else {
                reasons.push(CompatibilityReason {
                    code: "unsupported_target".to_string(),
                    message: "No compatible package target was found for this system.".to_string(),
                    technical_details: Some(detail),
                });
            }
        }

        if reasons.is_empty() {
            reasons.push(CompatibilityReason {
                code: "unsupported_target".to_string(),
                message: "No compatible package target was found for this system.".to_string(),
                technical_details: Some(format!(
                    "No targets matched host requirements for {HOST_OS}/{HOST_ARCH}."
                )),
            });
        }

        return Ok(SelectedTarget {
            id: None,
            payload_root: None,
            entrypoint: None,
            compatibility_status: "blocked".to_string(),
            compatibility_reasons: deduplicate_compatibility_reasons(reasons),
        });
    }

    if host_matches.len() > 1 {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "Multiple compatible targets matched this system ({HOST_OS}/{HOST_ARCH}); make target metadata more specific"
        )));
    }

    Ok(host_matches.remove(0))
}

fn resolve_target_entrypoint(
    target: &crate::manifest::v1::PackageTargetV1,
    interface_modes: &ResolvedInterface,
) -> Result<String, YambuckError> {
    let gui_entrypoint = target
        .entrypoints
        .gui
        .as_deref()
        .and_then(sanitize_non_empty_text);
    let cli_entrypoint = target
        .entrypoints
        .cli
        .as_deref()
        .and_then(sanitize_non_empty_text);

    if interface_modes.has_gui && gui_entrypoint.is_none() {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "target `{}` is missing `entrypoints.gui` while GUI interface is enabled",
            target.id
        )));
    }

    if interface_modes.has_cli && cli_entrypoint.is_none() {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "target `{}` is missing `entrypoints.cli` while CLI interface is enabled",
            target.id
        )));
    }

    if interface_modes.has_gui {
        return Ok(gui_entrypoint.unwrap_or_default());
    }
    Ok(cli_entrypoint.unwrap_or_default())
}

fn normalize_target_os(value: &str) -> Result<&'static str, YambuckError> {
    match value.trim().to_ascii_lowercase().as_str() {
        "linux" => Ok("linux"),
        "windows" => Ok("windows"),
        "macos" => Ok("macos"),
        other => Err(YambuckError::InvalidManifestDetails(format!(
            "unsupported target os `{other}`; supported values are linux, windows, macos"
        ))),
    }
}

fn normalize_target_arch(value: &str) -> Result<&'static str, YambuckError> {
    match value.trim().to_ascii_lowercase().as_str() {
        "x86_64" | "amd64" => Ok("x86_64"),
        "aarch64" | "arm64" => Ok("aarch64"),
        "riscv64" => Ok("riscv64"),
        other => Err(YambuckError::InvalidManifestDetails(format!(
            "unsupported target arch `{other}`; supported values are x86_64, aarch64, riscv64"
        ))),
    }
}

fn normalize_variant(value: Option<&str>) -> String {
    value
        .and_then(sanitize_non_empty_text)
        .unwrap_or_else(|| "default".to_string())
}

fn normalize_linux_desktops(
    linux: Option<&crate::manifest::v1::LinuxTargetSupportV1>,
) -> Result<Vec<String>, YambuckError> {
    let Some(value) = linux else {
        return Ok(vec!["x11".to_string(), "wayland".to_string()]);
    };
    let Some(desktops) = value.desktop_environments.as_ref() else {
        return Ok(vec!["x11".to_string(), "wayland".to_string()]);
    };

    if desktops.is_empty() {
        return Err(YambuckError::InvalidManifestDetails(
            "`linux.desktopEnvironments` must not be empty when provided".to_string(),
        ));
    }

    let mut normalized = Vec::with_capacity(desktops.len());
    for desktop in desktops {
        let canonical = match desktop.trim().to_ascii_lowercase().as_str() {
            "x11" => "x11",
            "wayland" => "wayland",
            other => {
                return Err(YambuckError::InvalidManifestDetails(format!(
                    "unsupported desktop environment `{other}`; supported values are x11, wayland"
                )))
            }
        };
        if !normalized.iter().any(|value| value == canonical) {
            normalized.push(canonical.to_string());
        }
    }
    Ok(normalized)
}

fn validate_payload_root_format(path: &str) -> Result<(), YambuckError> {
    validate_safe_relative_path("payloadRoot", path)?;
    let mut components = Path::new(path)
        .components()
        .filter_map(|component| component.as_os_str().to_str())
        .collect::<Vec<&str>>();

    if components.len() < 4 {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`payloadRoot` must follow `payloads/<os>/<arch>/<variant>/...` (received `{path}`)"
        )));
    }

    if components[0] != "payloads" {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`payloadRoot` must start with `payloads/` (received `{path}`)"
        )));
    }

    components.drain(0..4);
    Ok(())
}

fn validate_safe_relative_path(field_name: &str, path: &str) -> Result<(), YambuckError> {
    let parsed = Path::new(path);
    if path.trim().is_empty() || parsed.is_absolute() {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` must be a non-empty relative path"
        )));
    }

    if parsed
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` must not include parent traversal (`..`)"
        )));
    }

    Ok(())
}

fn validate_archive_file_exists(
    archive: &mut ZipArchive<fs::File>,
    path: &str,
    field_name: &str,
) -> Result<(), YambuckError> {
    let file = archive.by_name(path).map_err(|_| {
        YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` references a missing file: `{path}`"
        ))
    })?;

    if file.name().ends_with('/') {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` must reference a file, but `{path}` is a directory"
        )));
    }
    Ok(())
}

fn validate_archive_directory_exists(
    archive: &mut ZipArchive<fs::File>,
    path: &str,
    field_name: &str,
) -> Result<(), YambuckError> {
    let normalized = format!("{}/", path.trim_end_matches('/'));
    if archive.by_name(&normalized).is_ok() {
        return Ok(());
    }

    for index in 0..archive.len() {
        let file = archive
            .by_index(index)
            .map_err(|_| YambuckError::InvalidPackageFile)?;
        if file.name().starts_with(&normalized) {
            return Ok(());
        }
    }

    Err(YambuckError::InvalidManifestDetails(format!(
        "`{field_name}` references a missing directory: `{path}`"
    )))
}

fn detect_host_desktop_environment() -> Option<String> {
    let session = std::env::var("XDG_SESSION_TYPE")
        .ok()
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty());

    if let Some(value) = session {
        if value == "x11" || value == "wayland" {
            return Some(value);
        }
    }

    let desktop = std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("DESKTOP_SESSION"))
        .ok()
        .map(|value| value.to_ascii_lowercase())?;

    if desktop.contains("wayland") {
        return Some("wayland".to_string());
    }
    if desktop.contains("x11") || desktop.contains("xfce") {
        return Some("x11".to_string());
    }

    None
}

fn deduplicate_compatibility_reasons(
    reasons: Vec<CompatibilityReason>,
) -> Vec<CompatibilityReason> {
    let mut seen = HashSet::<String>::new();
    let mut unique = Vec::new();

    for reason in reasons {
        let key = format!(
            "{}|{}|{}",
            reason.code,
            reason.message,
            reason.technical_details.as_deref().unwrap_or("")
        );
        if seen.insert(key) {
            unique.push(reason);
        }
    }

    unique
}

fn evaluate_runtime_dependency_checks(
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

fn runtime_check_applies_to_host(
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

fn evaluate_command_check(
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

fn evaluate_file_check(
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

fn resolve_command_path(command_name: &str) -> Option<std::path::PathBuf> {
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

fn runtime_severity_label(
    severity: crate::manifest::v1::RuntimeDependencySeverityV1,
) -> &'static str {
    match severity {
        crate::manifest::v1::RuntimeDependencySeverityV1::Block => "block",
        crate::manifest::v1::RuntimeDependencySeverityV1::Warn => "warn",
    }
}

#[cfg(unix)]
fn is_metadata_executable(metadata: &fs::Metadata) -> bool {
    use std::os::unix::fs::PermissionsExt;
    metadata.permissions().mode() & 0o111 != 0
}

#[cfg(not(unix))]
fn is_metadata_executable(_metadata: &fs::Metadata) -> bool {
    true
}

fn is_executable_path(path: &Path) -> bool {
    match path.metadata() {
        Ok(metadata) => is_metadata_executable(&metadata),
        Err(_) => false,
    }
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
    kind: AssetKind,
) -> Result<String, YambuckError> {
    let field_name = asset_field_name(kind);
    let bytes = read_archive_asset_bytes(archive, asset_path, &field_name)?;
    let format = image::guess_format(&bytes).map_err(|_| {
        YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` file `{asset_path}` is not a valid PNG/JPG/JPEG/GIF image"
        ))
    })?;

    let mime = mime_for_asset(format);
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{mime};base64,{encoded}"))
}

fn validate_image_asset(
    archive: &mut ZipArchive<fs::File>,
    asset_path: &str,
    kind: AssetKind,
) -> Result<(), YambuckError> {
    let field_name = asset_field_name(kind);
    let expected_format = expected_image_format(asset_path, kind)?;
    let bytes = read_archive_asset_bytes(archive, asset_path, &field_name)?;

    if bytes.is_empty() {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` file `{asset_path}` is empty"
        )));
    }

    let min_bytes = min_asset_bytes(kind);
    if bytes.len() < min_bytes {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` file `{asset_path}` is too small ({} bytes); minimum is {} bytes",
            bytes.len(),
            min_bytes
        )));
    }

    let detected_format = image::guess_format(&bytes).map_err(|_| {
        YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` file `{asset_path}` is not a valid PNG/JPG/JPEG/GIF image"
        ))
    })?;

    if detected_format != expected_format {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` file `{asset_path}` extension does not match image data (expected {}, detected {})",
            image_format_label(expected_format),
            image_format_label(detected_format)
        )));
    }

    let decoded = image::load_from_memory_with_format(&bytes, detected_format).map_err(|_| {
        YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` file `{asset_path}` could not be decoded as a valid image"
        ))
    })?;

    let width = decoded.width();
    let height = decoded.height();
    let (min_width, min_height) = min_asset_dimensions(kind);

    if width < min_width || height < min_height {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` file `{asset_path}` is too small ({}x{}); minimum is {}x{}",
            width, height, min_width, min_height
        )));
    }

    if let AssetKind::Screenshot(index) = kind {
        let aspect_ratio = width as f32 / height as f32;
        if !(SCREENSHOT_MIN_ASPECT_RATIO..=SCREENSHOT_MAX_ASPECT_RATIO).contains(&aspect_ratio) {
            return Err(YambuckError::InvalidManifestDetails(format!(
                "`screenshots[{index}]` file `{asset_path}` uses an unsupported aspect ratio ({:.2}); supported range is {:.2} to {:.2}",
                aspect_ratio,
                SCREENSHOT_MIN_ASPECT_RATIO,
                SCREENSHOT_MAX_ASPECT_RATIO
            )));
        }
    }

    Ok(())
}

fn read_archive_asset_bytes(
    archive: &mut ZipArchive<fs::File>,
    asset_path: &str,
    field_name: &str,
) -> Result<Vec<u8>, YambuckError> {
    let mut file = archive.by_name(asset_path).map_err(|_| {
        YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` references a missing file: `{asset_path}`"
        ))
    })?;

    if file.name().ends_with('/') {
        return Err(YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` must reference a file, but `{asset_path}` is a directory"
        )));
    }

    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|_| {
        YambuckError::InvalidManifestDetails(format!(
            "`{field_name}` file `{asset_path}` is unreadable"
        ))
    })?;
    Ok(bytes)
}

fn expected_image_format(asset_path: &str, kind: AssetKind) -> Result<ImageFormat, YambuckError> {
    let field_name = asset_field_name(kind);
    let extension = Path::new(asset_path)
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| {
            YambuckError::InvalidManifestDetails(format!(
                "`{field_name}` path `{asset_path}` must include a supported image extension"
            ))
        })?;

    match kind {
        AssetKind::Icon => match extension.as_str() {
            "png" => Ok(ImageFormat::Png),
            "jpg" | "jpeg" => Ok(ImageFormat::Jpeg),
            _ => Err(YambuckError::InvalidManifestDetails(format!(
                "`iconPath` must use PNG, JPG, or JPEG (received `{asset_path}`)"
            ))),
        },
        AssetKind::Screenshot(index) => match extension.as_str() {
            "png" => Ok(ImageFormat::Png),
            "jpg" | "jpeg" => Ok(ImageFormat::Jpeg),
            "gif" => Ok(ImageFormat::Gif),
            _ => Err(YambuckError::InvalidManifestDetails(format!(
                "`screenshots[{index}]` must use PNG, JPG, JPEG, or GIF (received `{asset_path}`)"
            ))),
        },
    }
}

fn asset_field_name(kind: AssetKind) -> String {
    match kind {
        AssetKind::Icon => "iconPath".to_string(),
        AssetKind::Screenshot(index) => format!("screenshots[{index}]"),
    }
}

fn min_asset_dimensions(kind: AssetKind) -> (u32, u32) {
    match kind {
        AssetKind::Icon => (ICON_MIN_WIDTH, ICON_MIN_HEIGHT),
        AssetKind::Screenshot(_) => (SCREENSHOT_MIN_WIDTH, SCREENSHOT_MIN_HEIGHT),
    }
}

fn min_asset_bytes(kind: AssetKind) -> usize {
    match kind {
        AssetKind::Icon => ICON_MIN_BYTES,
        AssetKind::Screenshot(_) => SCREENSHOT_MIN_BYTES,
    }
}

fn image_format_label(format: ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "PNG",
        ImageFormat::Jpeg => "JPEG",
        ImageFormat::Gif => "GIF",
        _ => "unsupported",
    }
}

fn mime_for_asset(format: ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "image/png",
        ImageFormat::Jpeg => "image/jpeg",
        ImageFormat::Gif => "image/gif",
        _ => "application/octet-stream",
    }
}
