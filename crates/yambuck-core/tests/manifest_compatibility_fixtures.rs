use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
use std::fs;
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};

fn read_manifest_fixture(name: &str) -> String {
    fs::read_to_string(
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("manifests")
            .join(name),
    )
    .expect("read manifest fixture")
}

fn make_temp_dir(label: &str) -> PathBuf {
    let base = std::env::temp_dir().join(format!(
        "yambuck-core-compat-{label}-{}-{}",
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
        Rgba([14, 165, 233, 255]),
    ));
    let mut cursor = Cursor::new(Vec::new());
    image
        .write_to(&mut cursor, ImageFormat::Png)
        .expect("encode png");
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

#[test]
fn accepts_valid_v1_fixture_package() {
    let root = make_temp_dir("v1-valid");
    let manifest = read_manifest_fixture("v1-valid.json");
    let icon = make_png(256, 256);
    let screenshot = make_png(1024, 640);
    let package = write_package(
        &root,
        "v1-valid",
        &manifest,
        &[
            ("assets/icon.png", &icon),
            ("assets/screenshots/main.png", &screenshot),
            (
                "payloads/linux/x86_64/default/app/run.sh",
                b"#!/bin/sh\nexit 0\n",
            ),
        ],
    );

    let workflow = yambuck_core::inspect_package_workflow(&package.to_string_lossy())
        .expect("v1 fixture package should pass");
    assert_eq!(workflow.manifest_major, 1);
    assert_eq!(workflow.package_info.manifest_version, "1.0.0");
}

#[test]
fn rejects_v2_fixture_as_not_implemented_with_explicit_message() {
    let root = make_temp_dir("v2-not-implemented");
    let manifest = read_manifest_fixture("v2-minimal.json");
    let package = write_package(&root, "v2-minimal", &manifest, &[]);

    let error = match yambuck_core::inspect_package_workflow(&package.to_string_lossy()) {
        Ok(_) => panic!("v2 should be rejected as not implemented"),
        Err(error) => error,
    };
    let message = error.to_string();
    assert!(
        message.contains("manifest major version recognized but not yet implemented: 2.0.0"),
        "unexpected v2 error message: {message}"
    );
}

#[test]
fn rejects_unknown_major_manifest_fixture_with_actionable_error() {
    let root = make_temp_dir("unknown-major");
    let manifest = read_manifest_fixture("v99-unsupported.json");
    let package = write_package(&root, "v99", &manifest, &[]);

    let error = match yambuck_core::inspect_package_workflow(&package.to_string_lossy()) {
        Ok(_) => panic!("unknown major should fail"),
        Err(error) => error,
    };
    let message = error.to_string();
    assert!(
        message.contains("unsupported manifest major version: 99.0.0"),
        "unexpected unknown-major message: {message}"
    );
}
