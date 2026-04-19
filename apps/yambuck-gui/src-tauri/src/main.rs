// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args = std::env::args().collect::<Vec<String>>();
    if let Some(code) = yambuck_gui_lib::maybe_run_elevated_install_mode(&args) {
        std::process::exit(code);
    }

    yambuck_gui_lib::run()
}
