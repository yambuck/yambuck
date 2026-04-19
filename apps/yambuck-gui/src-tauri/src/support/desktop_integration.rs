use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::support::logging::append_log;

const DESKTOP_FILE_NAME: &str = "com.yambuck.installer.desktop";
const MIME_XML_NAME: &str = "application-x-yambuck-package.xml";
const MIME_TYPE: &str = "application/x-yambuck-package";
const APP_ICON_NAME: &str = "com.yambuck.installer";
const MIME_ICON_NAME: &str = "application-x-yambuck-package";

const ICON_32_PNG: &[u8] = include_bytes!("../../icons/32x32.png");
const ICON_128_PNG: &[u8] = include_bytes!("../../icons/128x128.png");
const ICON_SVG: &str = include_str!("../../icons/icon-source.svg");

pub(crate) fn ensure_desktop_integration() -> Result<(), String> {
    if std::env::consts::OS != "linux" {
        return Ok(());
    }

    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let xdg_data_home = std::env::var("XDG_DATA_HOME")
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(&home).join(".local").join("share"));

    let desktop_dir = xdg_data_home.join("applications");
    let mime_packages_dir = xdg_data_home.join("mime").join("packages");
    let icon_root = xdg_data_home.join("icons").join("hicolor");

    let desktop_file_path = desktop_dir.join(DESKTOP_FILE_NAME);
    let mime_xml_path = mime_packages_dir.join(MIME_XML_NAME);

    let _ = append_log(
        "INFO",
        "Ensuring Linux desktop MIME/icon integration for .yambuck files",
    );

    fs::create_dir_all(&desktop_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&mime_packages_dir).map_err(|error| error.to_string())?;

    write_icon_assets(&icon_root)?;
    write_desktop_file(&desktop_file_path)?;
    write_mime_xml(&mime_xml_path)?;

    refresh_desktop_databases(&xdg_data_home, &desktop_dir, &icon_root);
    maybe_set_default_handler(&desktop_file_path);

    Ok(())
}

fn write_icon_assets(icon_root: &Path) -> Result<(), String> {
    write_icon(
        &icon_root
            .join("32x32")
            .join("apps")
            .join(format!("{APP_ICON_NAME}.png")),
        ICON_32_PNG,
    )?;
    write_icon(
        &icon_root
            .join("32x32")
            .join("mimetypes")
            .join(format!("{MIME_ICON_NAME}.png")),
        ICON_32_PNG,
    )?;
    write_icon(
        &icon_root
            .join("128x128")
            .join("apps")
            .join(format!("{APP_ICON_NAME}.png")),
        ICON_128_PNG,
    )?;
    write_icon(
        &icon_root
            .join("128x128")
            .join("mimetypes")
            .join(format!("{MIME_ICON_NAME}.png")),
        ICON_128_PNG,
    )?;
    write_text_asset(
        &icon_root
            .join("scalable")
            .join("apps")
            .join(format!("{APP_ICON_NAME}.svg")),
        ICON_SVG,
    )?;
    write_text_asset(
        &icon_root
            .join("scalable")
            .join("mimetypes")
            .join(format!("{MIME_ICON_NAME}.svg")),
        ICON_SVG,
    )?;
    Ok(())
}

fn write_desktop_file(path: &Path) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let exec_path = shell_quote_path(&current_exe);
    let desktop_file = format!(
        "[Desktop Entry]\nName=Yambuck\nComment=Install .yambuck application packages\nExec={exec_path} %F\nTerminal=false\nType=Application\nIcon={APP_ICON_NAME}\nCategories=Utility;PackageManager;\nMimeType={MIME_TYPE};\nStartupNotify=true\n"
    );

    write_text_asset(path, &desktop_file)
}

fn write_mime_xml(path: &Path) -> Result<(), String> {
    let xml = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<mime-info xmlns='http://www.freedesktop.org/standards/shared-mime-info'>\n  <mime-type type=\"{MIME_TYPE}\">\n    <comment>Yambuck package</comment>\n    <icon name=\"{MIME_ICON_NAME}\"/>\n    <glob pattern=\"*.yambuck\"/>\n  </mime-type>\n</mime-info>\n"
    );

    write_text_asset(path, &xml)
}

fn refresh_desktop_databases(xdg_data_home: &Path, desktop_dir: &Path, icon_root: &Path) {
    let mime_root = xdg_data_home.join("mime");

    run_optional_command(
        "update-mime-database",
        &[mime_root.to_string_lossy().as_ref()],
    );
    run_optional_command(
        "update-desktop-database",
        &[desktop_dir.to_string_lossy().as_ref()],
    );
    run_optional_command(
        "gtk-update-icon-cache",
        &["-f", "-t", icon_root.to_string_lossy().as_ref()],
    );
}

fn maybe_set_default_handler(desktop_file_path: &Path) {
    let desktop_name = desktop_file_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(DESKTOP_FILE_NAME);

    let current_default = Command::new("xdg-mime")
        .arg("query")
        .arg("default")
        .arg(MIME_TYPE)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|value| value.trim().to_string())
        .unwrap_or_default();

    if current_default.is_empty() {
        let _ = append_log(
            "INFO",
            "No default .yambuck handler set; registering Yambuck as default",
        );
        run_optional_command("xdg-mime", &["default", desktop_name, MIME_TYPE]);
        return;
    }

    if current_default == desktop_name {
        let _ = append_log("INFO", "Yambuck is already the default .yambuck handler");
        return;
    }

    let _ = append_log(
        "INFO",
        &format!("Leaving existing .yambuck default handler unchanged ({current_default})"),
    );
}

fn run_optional_command(command: &str, args: &[&str]) {
    if !has_command(command) {
        let _ = append_log(
            "WARN",
            &format!("Desktop integration helper not found: {command}"),
        );
        return;
    }

    match Command::new(command).args(args).status() {
        Ok(status) if status.success() => {}
        Ok(status) => {
            let _ = append_log(
                "WARN",
                &format!("Desktop integration helper failed: {command} exited with {status}"),
            );
        }
        Err(error) => {
            let _ = append_log(
                "WARN",
                &format!("Desktop integration helper failed to start: {command} ({error})"),
            );
        }
    }
}

fn has_command(command_name: &str) -> bool {
    Command::new(command_name).arg("--help").output().is_ok()
}

fn write_icon(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "invalid icon path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    fs::write(path, bytes).map_err(|error| error.to_string())
}

fn write_text_asset(path: &Path, content: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "invalid text asset path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    fs::write(path, content.as_bytes()).map_err(|error| error.to_string())
}

fn shell_quote_path(path: &Path) -> String {
    let text = path.to_string_lossy();
    let escaped = text.replace('"', "\\\"");
    format!("\"{escaped}\"")
}
