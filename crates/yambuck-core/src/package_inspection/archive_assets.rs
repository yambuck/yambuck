//! Reads package files and validates icon and screenshot assets.

use base64::Engine;
use image::ImageFormat;
use std::fs;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

use crate::YambuckError;

const ICON_MIN_WIDTH: u32 = 128;
const ICON_MIN_HEIGHT: u32 = 128;
const SCREENSHOT_MIN_WIDTH: u32 = 256;
const SCREENSHOT_MIN_HEIGHT: u32 = 256;
const SCREENSHOT_MIN_ASPECT_RATIO: f32 = 0.4;
const SCREENSHOT_MAX_ASPECT_RATIO: f32 = 2.5;
const ICON_MIN_BYTES: usize = 512;
const SCREENSHOT_MIN_BYTES: usize = 1024;

#[derive(Copy, Clone)]
pub(super) enum AssetKind {
    Icon,
    Screenshot(usize),
}

pub(super) fn read_archive_file_to_string(
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

pub(super) fn read_archive_asset_as_data_url(
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

pub(super) fn validate_image_asset(
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

pub(super) fn read_archive_asset_bytes(
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

pub(super) fn expected_image_format(
    asset_path: &str,
    kind: AssetKind,
) -> Result<ImageFormat, YambuckError> {
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

pub(super) fn asset_field_name(kind: AssetKind) -> String {
    match kind {
        AssetKind::Icon => "iconPath".to_string(),
        AssetKind::Screenshot(index) => format!("screenshots[{index}]"),
    }
}

pub(super) fn min_asset_dimensions(kind: AssetKind) -> (u32, u32) {
    match kind {
        AssetKind::Icon => (ICON_MIN_WIDTH, ICON_MIN_HEIGHT),
        AssetKind::Screenshot(_) => (SCREENSHOT_MIN_WIDTH, SCREENSHOT_MIN_HEIGHT),
    }
}

pub(super) fn min_asset_bytes(kind: AssetKind) -> usize {
    match kind {
        AssetKind::Icon => ICON_MIN_BYTES,
        AssetKind::Screenshot(_) => SCREENSHOT_MIN_BYTES,
    }
}

pub(super) fn image_format_label(format: ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "PNG",
        ImageFormat::Jpeg => "JPEG",
        ImageFormat::Gif => "GIF",
        _ => "unsupported",
    }
}

pub(super) fn mime_for_asset(format: ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "image/png",
        ImageFormat::Jpeg => "image/jpeg",
        ImageFormat::Gif => "image/gif",
        _ => "application/octet-stream",
    }
}
