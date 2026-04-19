#[tauri::command]
pub fn get_recent_logs(limit: Option<usize>) -> Result<String, String> {
    crate::get_recent_logs_impl(limit)
}

#[tauri::command]
pub fn clear_logs() -> Result<(), String> {
    crate::clear_logs_impl()
}

#[tauri::command]
pub fn log_ui_event(level: Option<String>, message: String) -> Result<(), String> {
    crate::log_ui_event_impl(level, message)
}

#[tauri::command]
pub fn open_logs_directory() -> Result<(), String> {
    crate::open_logs_directory_impl()
}
