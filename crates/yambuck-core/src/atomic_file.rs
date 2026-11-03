//! Crash-safe JSON state files (App Standard section 5).

use chrono::Local;
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

static STORAGE_NOTICES: Mutex<Vec<String>> = Mutex::new(Vec::new());

/// Writes `contents` to a temporary file next to `path`, flushes it to disk
/// and renames it over `path`, so a crash mid-save leaves either the old or
/// the new file, never a truncated one.
pub fn write_file_atomically(path: &Path, contents: &[u8]) -> io::Result<()> {
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "path has no parent"))?;
    let file_name = path
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "path has no file name"))?;
    let temp_path = parent.join(format!(
        ".{}.tmp-{}",
        file_name.to_string_lossy(),
        std::process::id()
    ));

    let result = (|| {
        let mut file = File::create(&temp_path)?;
        file.write_all(contents)?;
        file.sync_all()?;
        fs::rename(&temp_path, path)?;
        // Persist the rename itself.
        File::open(parent)?.sync_all()
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }
    result
}

/// Moves an unparseable file aside as `<file>.invalid-<timestamp>` so the app
/// can start from defaults without destroying what was there.
pub fn quarantine_invalid_file(path: &Path) -> io::Result<PathBuf> {
    let file_name = path
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "path has no file name"))?;
    let quarantined = path.with_file_name(format!(
        "{}.invalid-{}",
        file_name.to_string_lossy(),
        Local::now().format("%Y%m%dT%H%M%S%.3f")
    ));
    fs::rename(path, &quarantined)?;
    Ok(quarantined)
}

/// Records something the user must be told once (a quarantined file).
pub(crate) fn push_storage_notice(message: String) {
    if let Ok(mut notices) = STORAGE_NOTICES.lock() {
        notices.push(message);
    }
}

/// Every storage notice not yet taken.
pub fn take_storage_notices() -> Vec<String> {
    STORAGE_NOTICES
        .lock()
        .map(|mut notices| std::mem::take(&mut *notices))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{quarantine_invalid_file, write_file_atomically};
    use std::fs;

    fn scratch_dir(name: &str) -> std::path::PathBuf {
        let dir =
            std::env::temp_dir().join(format!("yambuck-atomic-file-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn atomic_write_replaces_the_file_and_leaves_no_temp_file() {
        let dir = scratch_dir("write");
        let path = dir.join("state.json");
        fs::write(&path, "old").unwrap();
        write_file_atomically(&path, b"new").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "new");
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn quarantine_keeps_the_invalid_contents() {
        let dir = scratch_dir("quarantine");
        let path = dir.join("state.json");
        fs::write(&path, "{not json").unwrap();
        let quarantined = quarantine_invalid_file(&path).unwrap();
        assert!(!path.exists());
        assert!(quarantined
            .file_name()
            .unwrap()
            .to_string_lossy()
            .starts_with("state.json.invalid-"));
        assert_eq!(fs::read_to_string(&quarantined).unwrap(), "{not json");
        fs::remove_dir_all(&dir).unwrap();
    }
}
