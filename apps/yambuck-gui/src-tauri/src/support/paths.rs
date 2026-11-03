//! Single owner of the GUI's on-disk locations (App Standard section 3).
//! Nothing else in the GUI calls `dirs::` directly.
//!
//! - `~/.config/yambuck` (`$XDG_CONFIG_HOME/yambuck`): `settings.json` and
//!   `debug/` (session, last-session and update logs).
//! - The XDG data and config homes, where Yambuck's own launcher, MIME type
//!   and icons are registered and `mimeapps.list` lives.
//!
//! The install index, ownership receipts and installed app payloads
//! (`~/.local/share/yambuck`, `/var/lib/yambuck`, `/opt/yambuck`) are owned by
//! yambuck-core's storage module, which also runs as root in the elevated
//! helper.

use std::fs;
use std::path::PathBuf;

const APP_DIR_NAME: &str = "yambuck";

/// `~/.config/yambuck`, not created.
pub fn config_root() -> Result<PathBuf, String> {
    Ok(user_config_home()?.join(APP_DIR_NAME))
}

/// `~/.config/yambuck/settings.json`.
pub fn settings_file() -> Result<PathBuf, String> {
    Ok(config_root()?.join("settings.json"))
}

/// `~/.config/yambuck/debug`, created.
pub fn debug_dir() -> Result<PathBuf, String> {
    let dir = config_root()?.join("debug");
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Failed creating directory '{}': {error}", dir.display()))?;
    Ok(dir)
}

/// `$XDG_CONFIG_HOME` (or `~/.config`).
pub fn user_config_home() -> Result<PathBuf, String> {
    dirs::config_dir().ok_or_else(|| "Could not resolve the config directory".to_string())
}

/// `$XDG_DATA_HOME` (or `~/.local/share`).
pub fn user_data_home() -> Result<PathBuf, String> {
    dirs::data_dir().ok_or_else(|| "Could not resolve the data directory".to_string())
}

/// Where versions up to 0.3.8 appended their log forever
/// (`~/.local/share/yambuck/logs`), removed at start-up.
pub fn legacy_log_dir() -> Result<PathBuf, String> {
    Ok(user_data_home()?.join(APP_DIR_NAME).join("logs"))
}
