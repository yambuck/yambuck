//! Things the user must be told once (App Standard section 5), such as a
//! settings file that could not be parsed and was set aside. The frontend
//! takes them and shows each as a warning toast.

use std::sync::Mutex;

static PENDING: Mutex<Vec<String>> = Mutex::new(Vec::new());

pub fn push(message: String) {
    log::warn!("{message}");
    if let Ok(mut pending) = PENDING.lock() {
        pending.push(message);
    }
}

/// Every notice not yet shown, including yambuck-core's storage notices.
pub fn take_all() -> Vec<String> {
    let mut notices = PENDING
        .lock()
        .map(|mut pending| std::mem::take(&mut *pending))
        .unwrap_or_default();
    for notice in yambuck_core::take_storage_notices() {
        log::warn!("{notice}");
        notices.push(notice);
    }
    notices
}
