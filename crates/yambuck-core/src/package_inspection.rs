use base64::Engine;
use std::fs;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

use crate::manifest::{self, ParsedManifest};
use crate::{
    InstallOptionDefinition, InstallWizardStep, InstallWorkflow, PackageInfo, YambuckError,
};

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

fn inspect_manifest_v1(
    package_file: &str,
    file_name: &str,
    manifest: crate::manifest::v1::PackageManifestV1,
    archive: &mut ZipArchive<fs::File>,
) -> Result<PackageInfo, YambuckError> {
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

    let screenshots = manifest.screenshots.unwrap_or_default();
    let icon_data_url = read_archive_asset_as_data_url(archive, &manifest.icon_path).ok();
    let screenshot_data_urls = screenshots
        .iter()
        .take(6)
        .filter_map(|path| read_archive_asset_as_data_url(archive, path).ok())
        .collect::<Vec<String>>();

    let trust_status = sanitize_trust_status(manifest.trust_status.as_deref());
    let long_description = manifest
        .long_description
        .and_then(|value| sanitize_non_empty_text(&value));
    let license_file = manifest
        .license_file
        .as_ref()
        .and_then(|value| sanitize_non_empty_text(value));
    let license_text = match license_file.as_ref() {
        Some(path) => {
            let raw_license_text = read_archive_file_to_string(archive, path)?;
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
        package_uuid: manifest.package_uuid,
        trust_status,
    })
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
