use serde::Deserialize;

use crate::{UpdateCheckResult, YambuckError};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateFeed {
    channel: String,
    version: String,
    notes_url: Option<String>,
    linux: LinuxFeed,
}

#[derive(Deserialize)]
struct LinuxFeed {
    #[serde(rename = "x86_64")]
    x86_64: Option<UpdateAsset>,
    #[serde(rename = "aarch64")]
    aarch64: Option<UpdateAsset>,
}

#[derive(Clone, Deserialize)]
struct UpdateAsset {
    url: String,
    sha256: String,
}

pub fn evaluate_update_feed(
    feed_json: &str,
    current_version: &str,
    machine_arch: &str,
) -> Result<UpdateCheckResult, YambuckError> {
    let feed: UpdateFeed =
        serde_json::from_str(feed_json).map_err(|_| YambuckError::InvalidUpdateFeed)?;

    let latest = parse_version(&feed.version)?;
    let current = parse_version(current_version)?;

    let arch_key = normalize_arch(machine_arch)?;
    let asset = match arch_key {
        "x86_64" => feed.linux.x86_64,
        "aarch64" => feed.linux.aarch64,
        _ => None,
    };

    let update_available = latest > current;
    if update_available && asset.is_none() {
        return Err(YambuckError::InvalidUpdateFeed);
    }

    Ok(UpdateCheckResult {
        current_version: current_version.to_string(),
        latest_version: feed.version,
        update_available,
        channel: feed.channel,
        notes_url: feed.notes_url,
        download_url: asset.as_ref().map(|item| item.url.clone()),
        sha256: asset.as_ref().map(|item| item.sha256.clone()),
    })
}

fn parse_version(value: &str) -> Result<semver::Version, YambuckError> {
    let normalized = value.trim().trim_start_matches('v');
    semver::Version::parse(normalized).map_err(|_| YambuckError::InvalidUpdateFeed)
}

fn normalize_arch(machine_arch: &str) -> Result<&'static str, YambuckError> {
    match machine_arch {
        "x86_64" | "amd64" => Ok("x86_64"),
        "aarch64" | "arm64" => Ok("aarch64"),
        _ => Err(YambuckError::UnsupportedArchitecture),
    }
}
