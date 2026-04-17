use yambuck_core::UpdateCheckResult;

#[tauri::command]
pub async fn check_for_updates(feed_url: Option<String>) -> Result<UpdateCheckResult, String> {
    crate::check_for_updates_impl(feed_url).await
}

#[tauri::command]
pub async fn apply_update_and_restart(
    download_url: String,
    expected_sha256: String,
) -> Result<(), String> {
    crate::apply_update_and_restart_impl(download_url, expected_sha256).await
}
