// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::Parser;

#[derive(Parser)]
#[command(
    name = "yambuck",
    version,
    about = "Guided installer for .yambuck application packages"
)]
struct Cli {
    /// .yambuck package to open (the desktop launcher passes files and file:// URIs)
    #[arg(value_name = "PACKAGE")]
    packages: Vec<String>,

    /// Set by the in-app updater when it relaunches this version because the
    /// install failed
    #[arg(long, hide = true)]
    update_failed: bool,
}

fn main() {
    // First, so a panic anywhere after this is logged.
    yambuck_gui_lib::install_logging();

    // Before anything touches GTK: the app ID as Wayland app_id, and the
    // WebKitGTK / GDK environment. Harmless for the elevated helper below,
    // which never starts GTK.
    yambuck_gui_lib::configure_linux_startup();

    let args = std::env::args().collect::<Vec<String>>();
    // The privileged helper re-executes this binary through pkexec with its
    // own internal arguments, so it runs before regular argument parsing.
    if let Some(code) = yambuck_gui_lib::maybe_run_elevated_mode(&args) {
        std::process::exit(code);
    }

    // Package arguments are read from the raw arguments by the app itself
    // (support::launch_args); clap handles --version, --help and the
    // updater's flag.
    let cli = Cli::parse();
    yambuck_gui_lib::run(yambuck_gui_lib::LaunchOptions {
        update_failed: cli.update_failed,
    })
}
