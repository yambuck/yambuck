use crate::support::system_info::SystemInfo;

#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    crate::get_system_info_impl()
}
