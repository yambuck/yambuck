//! Yambuck's settings (App Standard section 5): `~/.config/yambuck/settings.json`,
//! owned by this module. Saves are atomic; a file that does not parse is set
//! aside and Yambuck starts from defaults; a file that cannot be read stops
//! start-up with an error dialog rather than being overwritten.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::support::{notices, paths, session_log};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// Settings -> Debug log level: one of `session_log::LOG_LEVELS`.
    pub log_level: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            log_level: session_log::DEFAULT_LOG_LEVEL.to_string(),
        }
    }
}

static CURRENT: Mutex<Option<Settings>> = Mutex::new(None);

/// Why start-up cannot continue: the settings file exists but could not be
/// read.
pub struct UnreadableSettings {
    pub path: PathBuf,
    pub error: String,
}

/// Loads the settings once at start-up.
pub fn load() -> Result<Settings, UnreadableSettings> {
    let path = paths::settings_file().map_err(|error| UnreadableSettings {
        path: PathBuf::from("~/.config/yambuck/settings.json"),
        error,
    })?;
    let settings = match std::fs::read_to_string(&path) {
        Ok(contents) => parse_or_quarantine(&path, &contents),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Settings::default(),
        Err(error) => {
            return Err(UnreadableSettings {
                path,
                error: error.to_string(),
            })
        }
    };
    if let Ok(mut current) = CURRENT.lock() {
        *current = Some(settings.clone());
    }
    Ok(settings)
}

fn parse_or_quarantine(path: &std::path::Path, contents: &str) -> Settings {
    match serde_json::from_str::<Settings>(contents) {
        Ok(settings) => sanitize(settings),
        Err(parse_error) => {
            let message = match yambuck_core::quarantine_invalid_file(path) {
                Ok(quarantined) => format!(
                    "Your settings file {} could not be read ({parse_error}), so it was moved to {} and Yambuck started with default settings.",
                    path.display(),
                    quarantined.display()
                ),
                Err(error) => format!(
                    "Your settings file {} could not be read ({parse_error}) or set aside ({error}); Yambuck is using default settings.",
                    path.display()
                ),
            };
            notices::push(message);
            Settings::default()
        }
    }
}

/// Replaces values a hand edit made invalid with their defaults.
fn sanitize(mut settings: Settings) -> Settings {
    if session_log::parse_log_level(&settings.log_level).is_none() {
        log::warn!(
            "Unknown log level '{}' in settings; using '{}'",
            settings.log_level,
            session_log::DEFAULT_LOG_LEVEL
        );
        settings.log_level = session_log::DEFAULT_LOG_LEVEL.to_string();
    }
    settings
}

pub fn current() -> Settings {
    CURRENT
        .lock()
        .ok()
        .and_then(|current| current.clone())
        .unwrap_or_default()
}

/// Applies `change` and saves the result atomically.
pub fn update(change: impl FnOnce(&mut Settings)) -> Result<Settings, String> {
    let mut settings = current();
    change(&mut settings);
    let path = paths::settings_file()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Failed creating '{}': {error}", parent.display()))?;
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
    yambuck_core::write_file_atomically(&path, json.as_bytes())
        .map_err(|error| format!("Failed saving {}: {error}", path.display()))?;
    if let Ok(mut current) = CURRENT.lock() {
        *current = Some(settings.clone());
    }
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::{sanitize, Settings};

    #[test]
    fn missing_fields_take_defaults() {
        let settings: Settings = serde_json::from_str("{}").unwrap();
        assert_eq!(settings, Settings::default());
    }

    #[test]
    fn unknown_log_levels_fall_back_to_the_default() {
        let settings = sanitize(Settings {
            log_level: "loud".to_string(),
        });
        assert_eq!(settings, Settings::default());
    }
}
