#[tauri::command]
fn get_launch_status() -> String {
    "Application successfully launched.".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("example-app: application successfully launched");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_launch_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
