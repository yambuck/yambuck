//! Logging and crashes (App Standard section 3).
//!
//! `~/.config/yambuck/debug/session.log` holds this run's log; at start-up the
//! previous run's log becomes `last-session.log`, so the run before a crash
//! or restart is kept. Lines use the Yambuck time standard (RFC 3339 local
//! time with milliseconds and offset). Everything logs through the `log`
//! crate; the level is chosen in Settings -> Debug.

use chrono::{Local, SecondsFormat};
use log::{Level, LevelFilter, Log, Metadata, Record};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use crate::support::paths;
use crate::support::system_info::SystemInfo;

const SESSION_LOG_FILE_NAME: &str = "session.log";
const LAST_SESSION_LOG_FILE_NAME: &str = "last-session.log";

/// The levels offered in Settings -> Debug, most to least severe.
pub const LOG_LEVELS: [&str; 5] = ["error", "warn", "info", "debug", "trace"];
pub const DEFAULT_LOG_LEVEL: &str = "info";

static SESSION_LOG: OnceLock<(PathBuf, Mutex<File>)> = OnceLock::new();

struct SessionLogger;

static LOGGER: SessionLogger = SessionLogger;

impl Log for SessionLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= log::max_level()
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) {
            return;
        }
        let line = format_line(&record.level().to_string(), &record.args().to_string());
        match record.level() {
            Level::Error | Level::Warn => eprintln!("{line}"),
            _ => println!("{line}"),
        }
        append_line(&line);
    }

    fn flush(&self) {}
}

/// RFC 3339 local time with milliseconds and offset,
/// e.g. `2026-11-03T19:55:39.123+11:00`.
fn timestamp() -> String {
    Local::now().to_rfc3339_opts(SecondsFormat::Millis, false)
}

fn format_line(level: &str, message: &str) -> String {
    format!("[{}] [{level}] {message}", timestamp())
}

fn append_line(line: &str) {
    if let Some((_, file)) = SESSION_LOG.get() {
        if let Ok(mut file) = file.lock() {
            let _ = writeln!(file, "{line}");
        }
    }
}

/// Installs the `log` backend. Until `initialize_session_log` runs (and in
/// the elevated helper, which never writes the user's log) it only prints.
pub fn install_logger() {
    if log::set_logger(&LOGGER).is_ok() {
        log::set_max_level(LevelFilter::Info);
    }
}

/// Records every panic in the session log (then runs the default hook), so an
/// unexpected exit always leaves its reason and location behind. Installed
/// first thing in `main`.
pub fn install_panic_hook() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let payload = info.payload();
        let message = payload
            .downcast_ref::<&str>()
            .map(|message| message.to_string())
            .or_else(|| payload.downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "non-text panic payload".to_string());
        let location = info
            .location()
            .map(|location| format!("{}:{}", location.file(), location.line()))
            .unwrap_or_else(|| "unknown location".to_string());
        let thread = std::thread::current();
        append_line(&format_line(
            "PANIC",
            &format!(
                "thread '{}' panicked at {location}: {message}",
                thread.name().unwrap_or("unnamed")
            ),
        ));
        default_hook(info);
    }));
}

/// Starts this run's session log: keeps the previous one as
/// `last-session.log` and writes the header. Runs after the single-instance
/// guard, so a second launch never rotates the running instance's log.
pub fn initialize_session_log() -> Result<(), String> {
    let debug_dir = paths::debug_dir()?;
    let session_log_path = debug_dir.join(SESSION_LOG_FILE_NAME);
    if session_log_path.exists() {
        if let Err(error) = fs::rename(
            &session_log_path,
            debug_dir.join(LAST_SESSION_LOG_FILE_NAME),
        ) {
            eprintln!("Failed to keep the previous session log: {error}");
        }
    }

    let file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&session_log_path)
        .map_err(|error| format!("Failed to open {}: {error}", session_log_path.display()))?;
    SESSION_LOG
        .set((session_log_path, Mutex::new(file)))
        .map_err(|_| "Session log already initialized".to_string())?;

    append_line(&format_line("INFO", "SESSION START"));
    for header_line in SystemInfo::collect().summary().lines() {
        append_line(&format_line("INFO", header_line));
    }
    remove_legacy_log_dir();
    Ok(())
}

/// Versions up to 0.3.8 appended to `~/.local/share/yambuck/logs/current.log`
/// forever; nothing reads it any more.
fn remove_legacy_log_dir() {
    let Ok(legacy_dir) = paths::legacy_log_dir() else {
        return;
    };
    if legacy_dir.is_dir() {
        match fs::remove_dir_all(&legacy_dir) {
            Ok(()) => log::info!("Removed the legacy log folder {}", legacy_dir.display()),
            Err(error) => log::warn!(
                "Could not remove the legacy log folder {}: {error}",
                legacy_dir.display()
            ),
        }
    }
}

pub fn session_log_path() -> Result<PathBuf, String> {
    match SESSION_LOG.get() {
        Some((path, _)) => Ok(path.clone()),
        None => Ok(paths::debug_dir()?.join(SESSION_LOG_FILE_NAME)),
    }
}

pub fn session_log_text() -> Result<String, String> {
    let path = session_log_path()?;
    fs::read_to_string(&path).map_err(|error| format!("Failed to read {}: {error}", path.display()))
}

pub fn parse_log_level(level: &str) -> Option<LevelFilter> {
    LOG_LEVELS
        .contains(&level)
        .then(|| level.parse::<LevelFilter>().ok())
        .flatten()
}

pub fn apply_log_level(level: &str) -> Result<(), String> {
    let filter = parse_log_level(level).ok_or_else(|| format!("Unknown log level '{level}'"))?;
    log::set_max_level(filter);
    Ok(())
}

/// A frontend event at its own level (`INFO`, `WARN`, `ERROR`, `DEBUG`).
pub fn log_ui_event(level: Option<&str>, message: &str) {
    let level = match level.unwrap_or("INFO").to_ascii_uppercase().as_str() {
        "ERROR" => Level::Error,
        "WARN" | "WARNING" => Level::Warn,
        "DEBUG" => Level::Debug,
        _ => Level::Info,
    };
    log::log!(level, "[ui] {message}");
}

#[cfg(test)]
mod tests {
    use super::{format_line, parse_log_level, LOG_LEVELS};

    #[test]
    fn lines_carry_an_rfc3339_timestamp_with_milliseconds() {
        let line = format_line("INFO", "hello");
        let timestamp = &line[1..line.find(']').unwrap()];
        assert!(chrono::DateTime::parse_from_rfc3339(timestamp).is_ok());
        let fraction = timestamp.split_once('.').unwrap().1;
        assert!(fraction[..3].chars().all(|c| c.is_ascii_digit()));
        assert!(matches!(&fraction[3..4], "+" | "-"), "{timestamp}");
        assert!(line.ends_with("] [INFO] hello"));
    }

    #[test]
    fn only_the_offered_levels_parse() {
        for level in LOG_LEVELS {
            assert!(parse_log_level(level).is_some(), "{level}");
        }
        assert!(parse_log_level("off").is_none());
        assert!(parse_log_level("INFO").is_none());
    }
}
