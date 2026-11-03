//! Yambuck's app identity, per the Release and Update Standard (section 10).

/// The app's identity on Linux: Wayland app_id, GTK prgname and the launcher
/// name (`<APP_ID>.desktop`). Must equal the Tauri `identifier`. It must not
/// end in `.desktop` (KDE's kglobalacceld treats such names as desktop-file
/// launch shortcuts) or `.app` (collides with macOS bundle names).
pub const APP_ID: &str = "com.yambuck.yambuck";

/// The launcher, `packaging/<APP_ID>.desktop`. docs/install.sh writes the same
/// entry (the tests below keep them in step) and the app re-creates it for
/// the running executable (support::desktop_integration).
pub const DESKTOP_ENTRY_TEMPLATE: &str =
    include_str!("../../packaging/com.yambuck.yambuck.desktop");

/// Launcher and icon names used before the app ID was standardized. Installers
/// and the app's desktop integration remove them, and move a `.yambuck`
/// default-handler association that points at one of them to the new launcher.
pub const LEGACY_DESKTOP_FILE_NAMES: &[&str] =
    &["com.yambuck.installer.desktop", "yambuck.desktop"];
pub const LEGACY_ICON_NAMES: &[&str] = &["com.yambuck.installer"];

pub fn desktop_file_name() -> String {
    format!("{APP_ID}.desktop")
}

/// Sets the app identity. Must run at the very start of `main`, before any
/// GTK or portal use: GTK uses the prgname as the Wayland app_id (and the X11
/// WM_CLASS instance), which desktops match against `<APP_ID>.desktop`.
pub fn configure_app_identity() {
    gtk::glib::set_prgname(Some(APP_ID));
    gtk::glib::set_application_name("Yambuck");
}

#[cfg(test)]
mod tests {
    use super::{desktop_file_name, APP_ID, DESKTOP_ENTRY_TEMPLATE};

    #[test]
    fn app_id_matches_tauri_identifier() {
        let tauri_config: serde_json::Value =
            serde_json::from_str(include_str!("../../tauri.conf.json")).unwrap();
        assert_eq!(tauri_config["identifier"], APP_ID);
    }

    #[test]
    fn launcher_template_is_named_after_app_id() {
        let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        assert!(manifest_dir
            .join("packaging")
            .join(desktop_file_name())
            .is_file());
        assert!(DESKTOP_ENTRY_TEMPLATE.contains(&format!("\nStartupWMClass={APP_ID}\n")));
        assert!(DESKTOP_ENTRY_TEMPLATE.contains(&format!("\nIcon={APP_ID}\n")));
    }

    #[test]
    fn install_script_writes_the_same_launcher() {
        let install_sh = include_str!("../../../../../docs/install.sh");
        assert!(install_sh.contains(&format!("APP_ID=\"{APP_ID}\"")));
        assert!(install_sh.contains("Exec=${installed_bin} %F"));
        for line in DESKTOP_ENTRY_TEMPLATE
            .lines()
            .filter(|line| !line.starts_with("Exec="))
        {
            let expected = line
                .replace(&format!("Icon={APP_ID}"), "Icon=${APP_ID}")
                .replace(
                    &format!("StartupWMClass={APP_ID}"),
                    "StartupWMClass=${APP_ID}",
                );
            assert!(
                install_sh.lines().any(|candidate| candidate == expected),
                "docs/install.sh is missing launcher line: {expected}"
            );
        }
    }

    #[test]
    fn app_id_avoids_reserved_suffixes() {
        assert!(!APP_ID.ends_with(".desktop"));
        assert!(!APP_ID.ends_with(".app"));
        assert!(APP_ID.split('.').all(|segment| !segment.is_empty()
            && segment
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())));
    }
}
