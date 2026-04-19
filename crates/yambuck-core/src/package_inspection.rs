use base64::Engine;
use image::ImageFormat;
use std::fs;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

use crate::manifest::{self, ParsedManifest};
use crate::{
    InstallOptionDefinition, InstallWizardStep, InstallWorkflow, PackageInfo, YambuckError,
};

const ICON_MIN_WIDTH: u32 = 128;
const ICON_MIN_HEIGHT: u32 = 128;
const SCREENSHOT_MIN_WIDTH: u32 = 256;
const SCREENSHOT_MIN_HEIGHT: u32 = 256;
const ICON_MIN_BYTES: usize = 512;
const SCREENSHOT_MIN_BYTES: usize = 1024;

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
    let entrypoint = require_non_empty_manifest_text("entrypoint", &manifest.entrypoint)?;
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
        entrypoint,
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
