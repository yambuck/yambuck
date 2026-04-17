use chrono::{Local, SecondsFormat};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

pub fn append_log(level: &str, message: &str) -> Result<(), String> {
    let path = log_file_path()?;
    let parent = path
        .parent()
        .ok_or_else(|| "invalid log path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| error.to_string())?;

    let timestamp = iso_like_timestamp();
    let line = format!("[{timestamp}] [{}] {}\n", normalize_level(level), message);
    file.write_all(line.as_bytes())
        .map_err(|error| error.to_string())
}

pub fn get_recent_logs(limit: Option<usize>) -> Result<String, String> {
    let path = log_file_path()?;
    if !path.exists() {
        return Ok(String::new());
    }

    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let max_lines = limit.unwrap_or(250);
    if max_lines == 0 {
        return Ok(String::new());
    }

    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(max_lines);
    Ok(lines[start..].join("\n"))
}

pub fn clear_logs() -> Result<(), String> {
    let path = log_file_path()?;
    let parent = path
        .parent()
        .ok_or_else(|| "invalid log path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    fs::write(path, "").map_err(|error| error.to_string())?;
    Ok(())
}

pub fn update_helper_log_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    Ok(PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("yambuck")
        .join("logs")
        .join("update-helper.log"))
}

pub fn log_file_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    Ok(PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("yambuck")
        .join("logs")
        .join("current.log"))
}

fn normalize_level(level: &str) -> &str {
    match level.to_ascii_uppercase().as_str() {
        "DEBUG" => "DEBUG",
        "WARN" | "WARNING" => "WARN",
        "ERROR" => "ERROR",
        "INFO" => "INFO",
        _ => "INFO",
    }
}

fn iso_like_timestamp() -> String {
    Local::now().to_rfc3339_opts(SecondsFormat::Millis, false)
}
