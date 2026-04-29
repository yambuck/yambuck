use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

fn make_temp_dir(label: &str) -> PathBuf {
    let base = std::env::temp_dir().join(format!(
        "yambuck-core-runtime-deps-{label}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock")
            .as_nanos()
    ));
    fs::create_dir_all(&base).expect("create test temp dir");
    base
}

fn write_package(root: &Path, label: &str, manifest: &str) -> PathBuf {
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
    writer.finish().expect("finalize package zip");
    package_path
}

fn fixture_manifest_with_runtime_deps(check_block: &str) -> String {
    format!(
        r#"{{
  "manifestVersion": "1.0.0",
  "packageUuid": "11111111-1111-4111-8111-111111111111",
  "appId": "com.example.runtime",
  "appUuid": "22222222-2222-4222-8222-222222222222",
  "displayName": "Runtime Fixture",
  "description": "Fixture package for runtime dependency tests.",
  "version": "1.0.0",
  "publisher": "Yambuck Fixtures",
  "iconPath": "assets/icon.png",
  "runtimeDependencies": {{
    "strategy": "bundleFirst",
    "checks": [
      {check_block}
    ]
  }}
}}"#
    )
    .replace("{check_block}", check_block)
}

#[test]
fn reports_missing_command_runtime_dependency_issue() {
    let root = make_temp_dir("missing-command");
    let manifest = fixture_manifest_with_runtime_deps(
        r#"{
        "id": "missing-cmd",
        "type": "command",
        "name": "yambuck-command-that-does-not-exist",
        "severity": "warn",
        "message": "Required command missing.",
        "technicalHint": "Install the required runtime command.",
        "appliesTo": { "os": "linux" }
      }"#,
    );
    let package = write_package(&root, "missing-command", &manifest);

    let issues = yambuck_core::evaluate_runtime_dependency_issues(&package.to_string_lossy())
        .expect("runtime dependency evaluation should succeed");
    assert_eq!(issues.len(), 1);
    assert_eq!(issues[0].id, "missing-cmd");
    assert_eq!(issues[0].check_type, "command");
    assert_eq!(issues[0].severity, "warn");
    assert_eq!(issues[0].reason_code, "missing_runtime_dependency");
}

#[test]
fn skips_runtime_dependency_check_when_os_filter_does_not_match() {
    let root = make_temp_dir("os-filter-skip");
    let manifest = fixture_manifest_with_runtime_deps(
        r#"{
        "id": "windows-only-command",
        "type": "command",
        "name": "yambuck-command-that-does-not-exist",
        "severity": "block",
        "appliesTo": { "os": "windows" }
      }"#,
    );
    let package = write_package(&root, "os-filter-skip", &manifest);

    let issues = yambuck_core::evaluate_runtime_dependency_issues(&package.to_string_lossy())
        .expect("runtime dependency evaluation should succeed");
    assert!(
        issues.is_empty(),
        "non-matching os checks should be skipped"
    );
}
