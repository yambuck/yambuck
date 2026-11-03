//! Settings -> Debug's Logs block (App Standard section 4): the session log,
//! system info and log level, plus UI event logging and one-time notices.

use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::support::system_info::SystemInfo;
use crate::support::{notices, paths, session_log, settings, startup_env};

/// Opens a file or folder with the desktop's default handler, in the user's
/// own environment (not Yambuck's WebKitGTK overrides).
pub(crate) fn open_with_system(path: &std::path::Path) -> Result<(), String> {
    let mut command = std::process::Command::new("xdg-open");
    command.arg(path);
    startup_env::restore_for_child(&mut command);
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to open {}: {error}", path.display()))
}

#[tauri::command]
pub fn copy_session_log(app_handle: tauri::AppHandle) -> Result<(), String> {
    let text = session_log::session_log_text()?;
    app_handle
        .clipboard()
        .write_text(text)
        .map_err(|error| format!("Failed to copy the session log: {error}"))
}

#[tauri::command]
pub fn open_session_log() -> Result<(), String> {
    open_with_system(&session_log::session_log_path()?)
}

#[tauri::command]
pub fn open_log_folder() -> Result<(), String> {
    open_with_system(&paths::debug_dir()?)
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo::collect()
}

/// The session log, for the preview under the Logs block.
#[tauri::command]
pub fn get_session_log_text() -> Result<String, String> {
    session_log::session_log_text()
}

#[tauri::command]
pub fn get_log_level() -> String {
    settings::current().log_level
}

#[tauri::command]
pub fn set_log_level(level: String) -> Result<String, String> {
    session_log::apply_log_level(&level)?;
    settings::update(|settings| settings.log_level = level.clone())?;
    log::info!("Log level set to {level}");
    Ok(level)
}

#[tauri::command]
pub fn log_ui_event(level: Option<String>, message: String) {
    session_log::log_ui_event(level.as_deref(), &message);
}

/// Messages the user must see once (for example a settings file that was set
/// aside), shown by the frontend as warning toasts.
#[tauri::command]
pub fn take_notices() -> Vec<String> {
    notices::take_all()
}
