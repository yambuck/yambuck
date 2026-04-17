use base64::Engine;
use serde::Deserialize;
use std::fs;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

use crate::{PackageInfo, YambuckError};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PackageManifest {
    manifest_version: String,
    package_uuid: String,
    app_id: String,
    app_uuid: String,
    display_name: String,
    description: String,
    long_description: Option<String>,
    version: String,
    publisher: String,
    entrypoint: String,
    icon_path: String,
    screenshots: Option<Vec<String>>,
    homepage_url: Option<String>,
    support_url: Option<String>,
    license: Option<String>,
    license_file: Option<String>,
    requires_license_acceptance: Option<bool>,
    config_path: Option<String>,
    cache_path: Option<String>,
    temp_path: Option<String>,
    trust_status: Option<String>,
}

pub fn inspect_package(package_file: &str) -> Result<PackageInfo, YambuckError> {
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

    let manifest: PackageManifest =
        serde_json::from_str(&manifest_content).map_err(|_| YambuckError::InvalidManifest)?;

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

    if !is_supported_manifest_major(&manifest.manifest_version) {
        return Err(YambuckError::InvalidManifest);
    }

    let screenshots = manifest.screenshots.unwrap_or_default();
    let icon_data_url = read_archive_asset_as_data_url(&mut archive, &manifest.icon_path).ok();
    let screenshot_data_urls = screenshots
        .iter()
        .take(6)
        .filter_map(|path| read_archive_asset_as_data_url(&mut archive, path).ok())
        .collect::<Vec<String>>();

    let trust_status = sanitize_trust_status(manifest.trust_status.as_deref());
    let long_description = manifest.long_description.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });
    let license_file = sanitize_optional_text(manifest.license_file);
    let license_text = match license_file.as_ref() {
        Some(path) => {
            let raw_license_text = read_archive_file_to_string(&mut archive, path)?;
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
    let config_path = sanitize_optional_text(manifest.config_path);
    let cache_path = sanitize_optional_text(manifest.cache_path);
    let temp_path = sanitize_optional_text(manifest.temp_path);

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
        config_path,
        cache_path,
        temp_path,
        package_uuid: manifest.package_uuid,
        trust_status,
    })
}

fn sanitize_trust_status(value: Option<&str>) -> String {
    match value {
        Some("verified") => "verified".to_string(),
        _ => "unverified".to_string(),
    }
}

fn sanitize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn is_supported_manifest_major(version: &str) -> bool {
    let major = version
        .split('.')
        .next()
        .and_then(|segment| segment.parse::<u64>().ok())
        .unwrap_or_default();
    major == 1
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
