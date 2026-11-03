//! Linux start-up environment (App Standard section 2).
//!
//! Set at the very start of `main`, before Tauri, GTK or any portal call. The
//! values Yambuck overrides are remembered so the apps it launches start with
//! the user's own environment rather than Yambuck's WebKitGTK workarounds.

use std::sync::OnceLock;

/// Each variable Yambuck set, with the value it had before (None: unset).
static ORIGINAL_VALUES: OnceLock<Vec<(String, Option<String>)>> = OnceLock::new();

pub fn configure_linux_session_environment() {
    let mut overrides = vec![
        // WebKitGTK's DMA-BUF renderer and GPU sandbox cause a blank window or
        // an EGL_BAD_PARAMETER crash on Arch-based distros (CachyOS, Manjaro)
        // and some NVIDIA setups.
        ("WEBKIT_DISABLE_DMABUF_RENDERER", "1"),
        ("WEBKIT_DISABLE_GPU_SANDBOX", "1"),
    ];
    if is_wayland_session() {
        // Use GTK's native Wayland backend on a Wayland session.
        overrides.push(("GDK_BACKEND", "wayland"));
    }

    let mut originals = Vec::with_capacity(overrides.len());
    for (name, value) in overrides {
        originals.push((name.to_string(), std::env::var(name).ok()));
        // Runs first in `main`, before any other thread exists.
        std::env::set_var(name, value);
    }
    let _ = ORIGINAL_VALUES.set(originals);
}

/// The environment changes that undo Yambuck's overrides for a child process:
/// `Some(value)` restores a value, `None` removes a variable Yambuck added.
pub fn child_environment() -> Vec<(String, Option<String>)> {
    ORIGINAL_VALUES.get().cloned().unwrap_or_default()
}

/// Applies `child_environment` to a command Yambuck spawns for the user.
pub fn restore_for_child(command: &mut std::process::Command) {
    for (name, original) in child_environment() {
        match original {
            Some(value) => command.env(name, value),
            None => command.env_remove(name),
        };
    }
}

fn is_wayland_session() -> bool {
    std::env::var("XDG_SESSION_TYPE").is_ok_and(|value| value.eq_ignore_ascii_case("wayland"))
        || std::env::var_os("WAYLAND_DISPLAY").is_some_and(|value| !value.is_empty())
}
