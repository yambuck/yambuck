use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
use std::fs;
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};

fn fixture_manifest_v1_valid() -> String {
    fs::read_to_string(
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("manifests")
            .join("v1-valid.json"),
    )
    .expect("read v1 fixture manifest")
}

fn make_temp_dir(label: &str) -> PathBuf {
    let base = std::env::temp_dir().join(format!(
        "yambuck-core-test-{label}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock")
            .as_nanos()
    ));
    fs::create_dir_all(&base).expect("create test temp dir");
    base
}

fn make_png(width: u32, height: u32) -> Vec<u8> {
    let image = DynamicImage::ImageRgba8(RgbaImage::from_pixel(
        width,
        height,
        Rgba([45, 156, 219, 255]),
    ));
    let mut cursor = Cursor::new(Vec::new());
    image
        .write_to(&mut cursor, ImageFormat::Png)
        .expect("encode png");
    cursor.into_inner()
}

fn make_noisy_png(width: u32, height: u32) -> Vec<u8> {
    let mut pixels = RgbaImage::new(width, height);
    for (x, y, pixel) in pixels.enumerate_pixels_mut() {
        let red = ((x * 13 + y * 7) % 255) as u8;
        let green = ((x * 3 + y * 11) % 255) as u8;
        let blue = ((x * 17 + y * 5) % 255) as u8;
        *pixel = Rgba([red, green, blue, 255]);
    }

    let image = DynamicImage::ImageRgba8(pixels);
    let mut cursor = Cursor::new(Vec::new());
    image
        .write_to(&mut cursor, ImageFormat::Png)
        .expect("encode noisy png");
    cursor.into_inner()
}

fn write_package(root: &Path, label: &str, manifest: &str, assets: &[(&str, &[u8])]) -> PathBuf {
    let package_path = root.join(format!("{label}.yambuck"));
    let package_file = fs::File::create(&package_path).expect("create package file");
    let mut writer = zip::ZipWriter::new(package_file);
    let options = zip::write::SimpleFileOptions::default();

    writer
        .start_file("manifest.json", options)
        .expect("write manifest entry");
    writer
        .write_all(manifest.as_bytes())
        .expect("write manifest bytes");

    for (path, bytes) in assets {
        writer.start_file(path, options).expect("write asset entry");
        writer.write_all(bytes).expect("write asset bytes");
    }

    writer.finish().expect("finalize package zip");
    package_path
}

fn assert_invalid_details_contains(package_path: &Path, expected: &str) {
    let result = yambuck_core::inspect_package_workflow(&package_path.to_string_lossy());
    let error = match result {
        Ok(_) => panic!("expected package inspection to fail"),
        Err(error) => error,
    };
    let message = error.to_string();
    assert!(
        message.contains(expected),
        "expected error to contain `{expected}`, got `{message}`"
    );
}

#[test]
fn rejects_blank_icon_asset_fixture() {
    let root = make_temp_dir("blank-icon");
    let manifest = fixture_manifest_v1_valid();
    let screenshot = make_png(800, 600);

    let package = write_package(
        &root,
        "blank-icon",
        &manifest,
        &[
            ("assets/icon.png", &[]),
            ("assets/screenshots/main.png", &screenshot),
            (
                "payloads/linux/x86_64/default/app/run.sh",
                b"#!/bin/sh\nexit 0\n",
            ),
        ],
    );

    assert_invalid_details_contains(&package, "`iconPath` file `assets/icon.png` is empty");
}

#[test]
fn rejects_renamed_text_file_screenshot_fixture() {
    let root = make_temp_dir("renamed-text-screenshot");
    let manifest = fixture_manifest_v1_valid();
    let icon = make_png(256, 256);
    let fake_image_text = "not-an-image".repeat(120);

    let package = write_package(
        &root,
        "renamed-text-screenshot",
        &manifest,
        &[
            ("assets/icon.png", &icon),
            ("assets/screenshots/main.png", fake_image_text.as_bytes()),
            (
                "payloads/linux/x86_64/default/app/run.sh",
                b"#!/bin/sh\nexit 0\n",
            ),
        ],
    );

    assert_invalid_details_contains(
        &package,
        "`screenshots[0]` file `assets/screenshots/main.png` is not a valid PNG/JPG/JPEG/GIF image",
    );
}

#[test]
fn rejects_corrupt_icon_fixture() {
    let root = make_temp_dir("corrupt-icon");
    let manifest = fixture_manifest_v1_valid();
    let screenshot = make_png(1024, 768);
    let mut corrupt_icon = vec![137, 80, 78, 71, 13, 10, 26, 10];
    corrupt_icon.extend(vec![0u8; 520]);

    let package = write_package(
        &root,
        "corrupt-icon",
        &manifest,
        &[
            ("assets/icon.png", &corrupt_icon),
            ("assets/screenshots/main.png", &screenshot),
            (
                "payloads/linux/x86_64/default/app/run.sh",
                b"#!/bin/sh\nexit 0\n",
            ),
        ],
    );

    assert_invalid_details_contains(
        &package,
        "`iconPath` file `assets/icon.png` could not be decoded as a valid image",
    );
}

#[test]
fn rejects_too_small_screenshot_fixture() {
    let root = make_temp_dir("small-screenshot");
    let manifest = fixture_manifest_v1_valid();
    let icon = make_png(256, 256);
    let tiny_screenshot = make_noisy_png(200, 200);

    let package = write_package(
        &root,
        "small-screenshot",
        &manifest,
        &[
            ("assets/icon.png", &icon),
            ("assets/screenshots/main.png", &tiny_screenshot),
            (
                "payloads/linux/x86_64/default/app/run.sh",
                b"#!/bin/sh\nexit 0\n",
            ),
        ],
    );

    assert_invalid_details_contains(
        &package,
        "`screenshots[0]` file `assets/screenshots/main.png` is too small",
    );
}

#[test]
fn rejects_unsupported_screenshot_extension_fixture() {
    let root = make_temp_dir("unsupported-screenshot-extension");
    let mut manifest = fixture_manifest_v1_valid();
    manifest = manifest.replace("assets/screenshots/main.png", "assets/screenshots/main.bmp");
    let icon = make_png(256, 256);
    let screenshot = make_png(900, 700);

    let package = write_package(
        &root,
        "unsupported-screenshot-extension",
        &manifest,
        &[
            ("assets/icon.png", &icon),
            ("assets/screenshots/main.bmp", &screenshot),
            (
                "payloads/linux/x86_64/default/app/run.sh",
                b"#!/bin/sh\nexit 0\n",
            ),
        ],
    );

    assert_invalid_details_contains(&package, "`screenshots[0]` must use PNG, JPG, JPEG, or GIF");
}

#[test]
fn rejects_missing_required_assets_fixture() {
    let root = make_temp_dir("missing-assets");
    let manifest = fixture_manifest_v1_valid();

    let package = write_package(
        &root,
        "missing-assets",
        &manifest,
        &[(
            "payloads/linux/x86_64/default/app/run.sh",
            b"#!/bin/sh\nexit 0\n",
        )],
    );

    assert_invalid_details_contains(
        &package,
        "`iconPath` references a missing file: `assets/icon.png`",
    );
}
