use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};
use yambuck_core::{
    CompatibilityReason, InstallDecision, InstallOptionSubmission, InstallPreview, InstallWorkflow,
    InstalledApp, InstalledAppDetails, InstallerContext, PackageInfo, PreflightCheckResult,
    UninstallResult, UpdateCheckResult,
};

mod commands;
mod support;

pub(crate) const DEFAULT_UPDATE_FEED_URL: &str = "https://yambuck.com/updates/stable.json";
const OPEN_PACKAGE_EVENT: &str = "yambuck://open-package";
static WORKFLOW_COUNTER: AtomicU64 = AtomicU64::new(1);
static BUILDER_SESSION_COUNTER: AtomicU64 = AtomicU64::new(1);
static INSTALL_WORKFLOW_SESSIONS: LazyLock<Mutex<HashMap<String, WorkflowSessionEntry>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static BUILDER_SESSIONS: LazyLock<Mutex<HashMap<String, BuilderSessionEntry>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
const WORKFLOW_SESSION_TTL: Duration = Duration::from_secs(30 * 60);

#[derive(Clone)]
struct WorkflowSessionEntry {
    workflow: InstallWorkflow,
    last_touched: Instant,
}

#[derive(Clone)]
struct BuilderSessionEntry {
    workspace_dir: PathBuf,
    package_file: Option<String>,
    last_touched: Instant,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenPackageEventPayload {
    package_file: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallWorkflowSession {
    workflow_id: String,
    workflow: InstallWorkflow,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BuilderSessionState {
    session_id: String,
    package_file: Option<String>,
    manifest_json: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BuilderStagedFile {
    source_path: String,
    target_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallPreflightPackageSnapshot {
    display_name: String,
    version: String,
    app_id: String,
    package_uuid: String,
    selected_target_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallPreflightResult {
    status: String,
    message: String,
    reasons: Vec<CompatibilityReason>,
    host: support::system_info::SystemInfo,
    package: InstallPreflightPackageSnapshot,
}

fn next_workflow_id() -> String {
    let next = WORKFLOW_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("workflow-{next}")
}

fn purge_expired_workflow_sessions(sessions: &mut HashMap<String, WorkflowSessionEntry>) {
    let now = Instant::now();
    sessions.retain(|_, entry| now.duration_since(entry.last_touched) < WORKFLOW_SESSION_TTL);
}

fn store_workflow_session(workflow: InstallWorkflow) -> Result<InstallWorkflowSession, String> {
    let workflow_id = next_workflow_id();
    let mut sessions = INSTALL_WORKFLOW_SESSIONS
        .lock()
        .map_err(|_| "failed to lock workflow session store".to_string())?;
    purge_expired_workflow_sessions(&mut sessions);
    sessions.insert(
        workflow_id.clone(),
        WorkflowSessionEntry {
            workflow: workflow.clone(),
            last_touched: Instant::now(),
        },
    );
    Ok(InstallWorkflowSession {
        workflow_id,
        workflow,
    })
}

fn get_workflow_from_session(workflow_id: &str) -> Result<InstallWorkflow, String> {
    let mut sessions = INSTALL_WORKFLOW_SESSIONS
        .lock()
        .map_err(|_| "failed to lock workflow session store".to_string())?;
    purge_expired_workflow_sessions(&mut sessions);
    sessions
        .get_mut(workflow_id)
        .map(|entry| {
            entry.last_touched = Instant::now();
            entry.workflow.clone()
        })
        .ok_or_else(|| format!("install workflow session not found: {workflow_id}"))
}

fn remove_workflow_session(workflow_id: &str) -> Result<(), String> {
    let mut sessions = INSTALL_WORKFLOW_SESSIONS
        .lock()
        .map_err(|_| "failed to lock workflow session store".to_string())?;
    purge_expired_workflow_sessions(&mut sessions);
    sessions.remove(workflow_id);
    Ok(())
}

fn next_builder_session_id() -> String {
    let next = BUILDER_SESSION_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("builder-{next}")
}

fn purge_expired_builder_sessions(sessions: &mut HashMap<String, BuilderSessionEntry>) {
    let now = Instant::now();
    let mut expired_ids = Vec::new();

    for (session_id, entry) in sessions.iter() {
        if now.duration_since(entry.last_touched) >= WORKFLOW_SESSION_TTL {
            expired_ids.push(session_id.clone());
        }
    }

    for session_id in expired_ids {
        if let Some(entry) = sessions.remove(&session_id) {
            let _ = fs::remove_dir_all(entry.workspace_dir);
        }
    }
}

fn create_builder_workspace(session_id: &str) -> Result<PathBuf, String> {
    let workspace_dir = std::env::temp_dir().join(format!("yambuck-builder-{session_id}"));
    if workspace_dir.exists() {
        fs::remove_dir_all(&workspace_dir).map_err(|error| error.to_string())?;
    }
    fs::create_dir_all(&workspace_dir).map_err(|error| error.to_string())?;
    Ok(workspace_dir)
}

fn read_workspace_manifest(workspace_dir: &Path) -> Result<String, String> {
    let manifest_path = workspace_dir.join("manifest.json");
    fs::read_to_string(&manifest_path).map_err(|error| error.to_string())
}

fn write_workspace_manifest(workspace_dir: &Path, manifest_json: &str) -> Result<(), String> {
    let manifest_path = workspace_dir.join("manifest.json");
    fs::write(&manifest_path, manifest_json.as_bytes()).map_err(|error| error.to_string())
}

fn validate_builder_target_path(path: &str) -> Result<(), String> {
    let parsed = Path::new(path);
    if path.trim().is_empty() || parsed.is_absolute() {
        return Err("target path must be a non-empty relative path".to_string());
    }

    if parsed
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Err("target path must not include parent traversal (`..`)".to_string());
    }

    Ok(())
}

fn extract_package_to_workspace(package_file: &Path, workspace_dir: &Path) -> Result<(), String> {
    let file = fs::File::open(package_file).map_err(|error| error.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|error| error.to_string())?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|error| error.to_string())?;
        let Some(enclosed_name) = entry.enclosed_name() else {
            return Err("package contains unsafe archive path".to_string());
        };
        let output_path = workspace_dir.join(enclosed_name);

        if entry.name().ends_with('/') {
            fs::create_dir_all(&output_path).map_err(|error| error.to_string())?;
            continue;
        }

        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }

        let mut output_file = fs::File::create(&output_path).map_err(|error| error.to_string())?;
        std::io::copy(&mut entry, &mut output_file).map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn collect_workspace_files(root: &Path, current: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    for entry in fs::read_dir(current).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            collect_workspace_files(root, &path, files)?;
            continue;
        }
        if path.is_file() {
            let relative = path
                .strip_prefix(root)
                .map_err(|_| "failed to compute workspace relative path".to_string())?
                .to_path_buf();
            files.push(relative);
        }
    }
    Ok(())
}

fn write_workspace_package(workspace_dir: &Path, output_path: &Path) -> Result<(), String> {
    let parent = output_path
        .parent()
        .ok_or_else(|| "invalid output path".to_string())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;

    let temp_path = output_path.with_extension("yambuck.tmp");
    if temp_path.exists() {
        fs::remove_file(&temp_path).map_err(|error| error.to_string())?;
    }

    let output_file = fs::File::create(&temp_path).map_err(|error| error.to_string())?;
    let mut zip_writer = ZipWriter::new(output_file);

    let mut files = Vec::new();
    collect_workspace_files(workspace_dir, workspace_dir, &mut files)?;
    files.sort();

    let file_options = SimpleFileOptions::default();
    for relative_path in files {
        let source_path = workspace_dir.join(&relative_path);
        let path_in_zip = relative_path.to_string_lossy().replace('\\', "/");
        zip_writer
            .start_file(path_in_zip, file_options)
            .map_err(|error| error.to_string())?;

        let mut source_file = fs::File::open(source_path).map_err(|error| error.to_string())?;
        let mut buffer = Vec::new();
        source_file
            .read_to_end(&mut buffer)
            .map_err(|error| error.to_string())?;
        zip_writer
            .write_all(&buffer)
            .map_err(|error| error.to_string())?;
    }

    zip_writer.finish().map_err(|error| error.to_string())?;

    if output_path.exists() {
        fs::remove_file(output_path).map_err(|error| error.to_string())?;
    }
    fs::rename(&temp_path, output_path).map_err(|error| error.to_string())?;

    Ok(())
}

fn with_builder_session_mut<F, T>(session_id: &str, mut callback: F) -> Result<T, String>
where
    F: FnMut(&mut BuilderSessionEntry) -> Result<T, String>,
{
    let mut sessions = BUILDER_SESSIONS
        .lock()
        .map_err(|_| "failed to lock builder session store".to_string())?;
    purge_expired_builder_sessions(&mut sessions);
    let entry = sessions
        .get_mut(session_id)
        .ok_or_else(|| format!("builder session not found: {session_id}"))?;
    entry.last_touched = Instant::now();
    callback(entry)
}

fn inspect_package_workflow_with_shared_validation(
    package_file: &str,
    context: &str,
) -> Result<InstallWorkflow, String> {
    let _ = support::logging::append_log(
        "INFO",
        &format!(
            "[{context}] validating package with shared install inspection: {package_file}"
        ),
    );

    let workflow = yambuck_core::inspect_package_workflow(package_file)
        .map_err(|error| error.to_string())?;

    let _ = support::logging::append_log(
        "INFO",
        &format!(
            "[{context}] validation passed appId={} version={} target={} compatibility={}",
            workflow.package_info.app_id.as_str(),
            workflow.package_info.version.as_str(),
            workflow
                .package_info
                .selected_target_id
                .clone()
                .unwrap_or_else(|| "none".to_string()),
            workflow.package_info.compatibility_status.as_str()
        ),
    );

    Ok(workflow)
}

pub(crate) fn discard_install_workflow_impl(workflow_id: &str) -> Result<(), String> {
    remove_workflow_session(workflow_id)
}

pub(crate) fn get_installer_context_impl() -> InstallerContext {
    let _ = support::logging::append_log("INFO", "Loaded installer context");
    yambuck_core::installer_context(env!("CARGO_PKG_VERSION"))
}

pub(crate) fn inspect_package_impl(package_file: &str) -> Result<PackageInfo, String> {
    yambuck_core::inspect_package(package_file).map_err(|error| error.to_string())
}

pub(crate) fn inspect_package_workflow_impl(
    package_file: &str,
) -> Result<InstallWorkflowSession, String> {
    let workflow = inspect_package_workflow_with_shared_validation(package_file, "installer-open")?;
    store_workflow_session(workflow)
}

pub(crate) fn create_builder_session_impl() -> Result<BuilderSessionState, String> {
    let _ = support::logging::append_log("INFO", "[builder] creating new builder session");
    let session_id = next_builder_session_id();
    let workspace_dir = create_builder_workspace(&session_id)?;

    write_workspace_manifest(&workspace_dir, "{}")?;

    let mut sessions = BUILDER_SESSIONS
        .lock()
        .map_err(|_| "failed to lock builder session store".to_string())?;
    purge_expired_builder_sessions(&mut sessions);
    sessions.insert(
        session_id.clone(),
        BuilderSessionEntry {
            workspace_dir: workspace_dir.clone(),
            package_file: None,
            last_touched: Instant::now(),
        },
    );

    Ok(BuilderSessionState {
        session_id,
        package_file: None,
        manifest_json: read_workspace_manifest(&workspace_dir)?,
    })
}

pub(crate) fn open_builder_package_impl(package_file: &str) -> Result<BuilderSessionState, String> {
    let _ = support::logging::append_log(
        "INFO",
        &format!("[builder-open] requested package: {package_file}"),
    );
    let package_path = Path::new(package_file);
    if !package_path.exists() {
        return Err("selected package file does not exist".to_string());
    }

    let _ = inspect_package_workflow_with_shared_validation(package_file, "builder-open")?;

    let session_id = next_builder_session_id();
    let workspace_dir = create_builder_workspace(&session_id)?;
    extract_package_to_workspace(package_path, &workspace_dir)?;

    let manifest_json = read_workspace_manifest(&workspace_dir)?;

    let mut sessions = BUILDER_SESSIONS
        .lock()
        .map_err(|_| "failed to lock builder session store".to_string())?;
    purge_expired_builder_sessions(&mut sessions);
    sessions.insert(
        session_id.clone(),
        BuilderSessionEntry {
            workspace_dir,
            package_file: Some(package_file.to_string()),
            last_touched: Instant::now(),
        },
    );

    Ok(BuilderSessionState {
        session_id,
        package_file: Some(package_file.to_string()),
        manifest_json,
    })
}

pub(crate) fn stage_builder_files_impl(
    session_id: &str,
    files: Vec<BuilderStagedFile>,
) -> Result<(), String> {
    let _ = support::logging::append_log(
        "INFO",
        &format!("[builder-stage] session={session_id} files={}", files.len()),
    );
    with_builder_session_mut(session_id, |entry| {
        for item in &files {
            let source_path = Path::new(&item.source_path);
            if !source_path.exists() || !source_path.is_file() {
                return Err(format!("source file does not exist: {}", item.source_path));
            }

            validate_builder_target_path(&item.target_path)?;
            let target_path = entry.workspace_dir.join(&item.target_path);
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            fs::copy(source_path, &target_path).map_err(|error| error.to_string())?;
        }
        Ok(())
    })
}

pub(crate) fn save_builder_session_as_impl(
    session_id: &str,
    output_path: &str,
    manifest_json: &str,
) -> Result<(), String> {
    let _ = support::logging::append_log(
        "INFO",
        &format!("[builder-save-as] session={session_id} output={output_path}"),
    );
    let output = Path::new(output_path).to_path_buf();

    with_builder_session_mut(session_id, |entry| {
        write_workspace_manifest(&entry.workspace_dir, manifest_json)?;
        write_workspace_package(&entry.workspace_dir, &output)?;
        let output_value = output
            .to_str()
            .ok_or_else(|| "output path must be valid UTF-8".to_string())?;
        inspect_package_workflow_with_shared_validation(output_value, "builder-save-validate")
            .map_err(|error| format!("saved package failed validation: {error}"))?;
        Ok(())
    })
}

pub(crate) fn save_builder_session_impl(session_id: &str, manifest_json: &str) -> Result<(), String> {
    let _ = support::logging::append_log(
        "INFO",
        &format!("[builder-save] session={session_id}"),
    );
    let output_path = with_builder_session_mut(session_id, |entry| {
        entry
            .package_file
            .clone()
            .ok_or_else(|| "session has no original package path; use Save As".to_string())
    })?;

    save_builder_session_as_impl(session_id, &output_path, manifest_json)
}

pub(crate) fn discard_builder_session_impl(session_id: &str) -> Result<(), String> {
    let _ = support::logging::append_log(
        "INFO",
        &format!("[builder-discard] session={session_id}"),
    );
    let mut sessions = BUILDER_SESSIONS
        .lock()
        .map_err(|_| "failed to lock builder session store".to_string())?;
    purge_expired_builder_sessions(&mut sessions);
    if let Some(entry) = sessions.remove(session_id) {
        fs::remove_dir_all(entry.workspace_dir).map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub(crate) fn validate_install_options_impl(
    workflow_id: &str,
    submissions: Vec<InstallOptionSubmission>,
) -> Result<Vec<InstallOptionSubmission>, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    yambuck_core::validate_install_options(&workflow.install_options, submissions)
        .map_err(|error| error.to_string())
}

pub(crate) fn get_install_decision_impl(
    workflow_id: &str,
    scope: &str,
) -> Result<InstallDecision, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::evaluate_install_decision(&workflow.package_info, install_scope)
        .map_err(|error| error.to_string())
}

pub(crate) fn create_install_preview_impl(
    workflow_id: &str,
    scope: &str,
    verified_publisher: bool,
) -> Result<InstallPreview, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    let package_info = workflow.package_info;
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::create_install_preview(
        &package_info.package_file,
        &package_info.app_id,
        install_scope,
        verified_publisher,
    )
    .map_err(|error| error.to_string())
}

pub(crate) fn list_installed_apps_impl() -> Vec<InstalledApp> {
    yambuck_core::list_installed_apps()
}

pub(crate) fn get_installed_app_details_impl(
    app_id: &str,
    scope: &str,
) -> Result<InstalledAppDetails, String> {
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::get_installed_app_details(app_id, install_scope)
        .map_err(|error| error.to_string())
}

pub(crate) fn uninstall_installed_app_impl(
    app_id: &str,
    scope: &str,
    remove_user_data: bool,
) -> Result<UninstallResult, String> {
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    let _ = support::logging::append_log(
        "INFO",
        &format!(
            "Starting uninstall for appId={app_id} scope={scope} removeUserData={remove_user_data}"
        ),
    );
    let uninstall_result = match install_scope {
        yambuck_core::InstallScope::User => {
            yambuck_core::uninstall_installed_app(app_id, install_scope, remove_user_data)
                .map_err(|error| error.to_string())
        }
        yambuck_core::InstallScope::System => {
            support::elevation::uninstall_with_elevation_if_needed(app_id, remove_user_data)
        }
    };

    match uninstall_result {
        Ok(result) => {
            let _ = support::logging::append_log(
                "INFO",
                &format!(
                    "Uninstall completed for appId={} scope={} warnings={} removedAppFiles={} removedUserData={}",
                    result.app_id,
                    scope,
                    result.warnings.len(),
                    result.removed_app_files,
                    result.removed_user_data
                ),
            );
            Ok(result)
        }
        Err(error) => {
            let _ = support::logging::append_log(
                "ERROR",
                &format!(
                    "Uninstall failed for appId={app_id} scope={scope} removeUserData={remove_user_data}: {error}"
                ),
            );
            Err(error)
        }
    }
}

pub(crate) fn complete_install_impl(
    workflow_id: &str,
    scope: &str,
    destination_path: &str,
    submissions: Vec<InstallOptionSubmission>,
    allow_downgrade: bool,
) -> Result<InstalledApp, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    let _ = support::logging::append_log(
        "INFO",
        &format!(
            "Starting install for appId={} scope={scope} destination={destination_path}",
            workflow.package_info.app_id
        ),
    );
    yambuck_core::validate_install_options(&workflow.install_options, submissions)
        .map_err(|error| error.to_string())?;
    let package_info = workflow.package_info;

    let verified_package = yambuck_core::inspect_package(&package_info.package_file)
        .map_err(|error| error.to_string())?;
    if verified_package.package_uuid != package_info.package_uuid
        || verified_package.app_uuid != package_info.app_uuid
        || verified_package.app_id != package_info.app_id
    {
        return Err(
            "Package integrity check failed: package metadata changed since inspection. Re-open the package and try again."
                .to_string(),
        );
    }

    let install_result = match install_scope {
        yambuck_core::InstallScope::User => yambuck_core::install_and_register(
            &package_info,
            install_scope,
            destination_path,
            allow_downgrade,
        )
        .map_err(|error| error.to_string()),
        yambuck_core::InstallScope::System => support::elevation::install_with_elevation_if_needed(
            &package_info,
            destination_path,
            allow_downgrade,
        ),
    };
    let installed_app = match install_result {
        Ok(installed_app) => installed_app,
        Err(error) => {
            let _ = support::logging::append_log(
                "ERROR",
                &format!(
                    "Install failed for appId={} scope={scope} destination={destination_path}: {error}",
                    package_info.app_id
                ),
            );
            return Err(error);
        }
    };
    let _ = support::logging::append_log(
        "INFO",
        &format!(
            "Install completed for appId={} scope={scope}",
            installed_app.app_id
        ),
    );
    if let Err(error) = support::desktop_integration::ensure_desktop_integration() {
        let _ = support::logging::append_log(
            "WARN",
            &format!("Desktop integration refresh failed after install: {error}"),
        );
    }
    remove_workflow_session(workflow_id)?;
    Ok(installed_app)
}

pub fn maybe_run_elevated_mode(args: &[String]) -> Option<i32> {
    support::elevation::maybe_run_elevated_mode(args)
}

pub(crate) fn launch_installed_app_impl(app_id: &str, scope: &str) -> Result<(), String> {
    let install_scope =
        yambuck_core::InstallScope::try_from(scope).map_err(|error| error.to_string())?;
    yambuck_core::launch_installed_app(app_id, install_scope).map_err(|error| error.to_string())
}

pub(crate) fn preflight_install_check_impl(app_id: &str) -> Result<PreflightCheckResult, String> {
    yambuck_core::preflight_install_check(app_id).map_err(|error| error.to_string())
}

pub(crate) fn evaluate_install_preflight_impl(
    workflow_id: &str,
) -> Result<InstallPreflightResult, String> {
    let workflow = get_workflow_from_session(workflow_id)?;
    let package_info = workflow.package_info;
    let ownership_preflight = yambuck_core::preflight_install_check(&package_info.app_id)
        .map_err(|error| error.to_string())?;
    let host = support::system_info::get_system_info()?;

    let mut reasons = package_info.compatibility_reasons.clone();

    for reason_code in ownership_preflight.reasons {
        match reason_code.as_str() {
            "external_conflict" => reasons.push(CompatibilityReason {
                code: "external_conflict".to_string(),
                message: "This app appears to already be installed by another package system."
                    .to_string(),
                technical_details: Some(ownership_preflight.message.clone()),
            }),
            "managed_existing" => reasons.push(CompatibilityReason {
                code: "managed_existing".to_string(),
                message:
                    "An existing Yambuck-managed install was found. Installing will replace it cleanly."
                        .to_string(),
                technical_details: Some(ownership_preflight.message.clone()),
            }),
            _ => reasons.push(CompatibilityReason {
                code: reason_code,
                message: ownership_preflight.message.clone(),
                technical_details: None,
            }),
        }
    }

    let blocked = package_info.compatibility_status == "blocked"
        || ownership_preflight.status == "external_conflict";

    let status = if blocked { "blocked" } else { "ok" }.to_string();
    let message = if blocked {
        "This app is not supported on your current system. Contact the app developer or publisher and share the preflight report."
            .to_string()
    } else if ownership_preflight.status == "managed_existing" {
        ownership_preflight.message
    } else {
        "No compatibility or ownership blockers were detected.".to_string()
    };

    Ok(InstallPreflightResult {
        status,
        message,
        reasons,
        host,
        package: InstallPreflightPackageSnapshot {
            display_name: package_info.display_name,
            version: package_info.version,
            app_id: package_info.app_id,
            package_uuid: package_info.package_uuid,
            selected_target_id: package_info.selected_target_id,
        },
    })
}

pub(crate) fn get_startup_package_arg_impl() -> Option<String> {
    let args = std::env::args().collect::<Vec<String>>();
    support::launch_args::package_arg_from_launch_args(&args)
}

pub(crate) async fn check_for_updates_impl(
    feed_url: Option<String>,
) -> Result<UpdateCheckResult, String> {
    let url = feed_url.unwrap_or_else(|| DEFAULT_UPDATE_FEED_URL.to_string());
    let _ = support::logging::append_log("INFO", &format!("Checking updates from {url}"));
    let response = reqwest::get(url)
        .await
        .map_err(|error| format!("failed to fetch update feed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "update feed request failed with status {}",
            response.status()
        ));
    }

    let feed_json = response
        .text()
        .await
        .map_err(|error| format!("failed to read update feed response: {error}"))?;

    let result = yambuck_core::evaluate_update_feed(
        &feed_json,
        env!("CARGO_PKG_VERSION"),
        std::env::consts::ARCH,
    )
    .map_err(|error| error.to_string())?;

    if result.update_available {
        let _ = support::logging::append_log(
            "INFO",
            &format!(
                "Update available: {} -> {}",
                result.current_version, result.latest_version
            ),
        );
    } else {
        let _ = support::logging::append_log("INFO", "No update available");
    }

    Ok(result)
}

pub(crate) async fn apply_update_and_restart_impl(
    download_url: String,
    expected_sha256: String,
) -> Result<(), String> {
    support::update_apply::apply_update_and_restart(download_url, expected_sha256).await
}

pub(crate) fn get_system_info_impl() -> Result<support::system_info::SystemInfo, String> {
    support::system_info::get_system_info()
}

pub(crate) fn get_recent_logs_impl(limit: Option<usize>) -> Result<String, String> {
    support::logging::get_recent_logs(limit)
}

pub(crate) fn clear_logs_impl() -> Result<(), String> {
    support::logging::clear_logs()
}

pub(crate) fn log_ui_event_impl(level: Option<String>, message: String) -> Result<(), String> {
    let normalized = level.unwrap_or_else(|| "INFO".to_string());
    support::logging::append_log(&normalized, &message)
}

pub(crate) fn open_logs_directory_impl() -> Result<(), String> {
    let log_file = support::logging::log_file_path()?;
    let log_dir = log_file
        .parent()
        .ok_or_else(|| "invalid log directory path".to_string())?
        .to_path_buf();

    std::fs::create_dir_all(&log_dir).map_err(|error| error.to_string())?;

    std::process::Command::new("xdg-open")
        .arg(&log_dir)
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            if let Some(package_file) = support::launch_args::package_arg_from_launch_args(&argv) {
                let payload = OpenPackageEventPayload { package_file };
                let _ = app.emit(OPEN_PACKAGE_EVENT, payload);
            }
        }))
        .setup(|_app| {
            if let Err(error) = support::desktop_integration::ensure_desktop_integration() {
                let _ = support::logging::append_log(
                    "WARN",
                    &format!("Desktop integration setup failed: {error}"),
                );
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::installer::get_installer_context,
            commands::installer::inspect_package,
            commands::installer::inspect_package_workflow,
            commands::installer::validate_install_options,
            commands::installer::get_install_decision,
            commands::installer::discard_install_workflow,
            commands::installer::create_install_preview,
            commands::update::check_for_updates,
            commands::update::apply_update_and_restart,
            commands::system::get_system_info,
            commands::logs::get_recent_logs,
            commands::logs::clear_logs,
            commands::logs::log_ui_event,
            commands::logs::open_logs_directory,
            commands::installer::preflight_install_check,
            commands::installer::evaluate_install_preflight,
            commands::installer::get_startup_package_arg,
            commands::installer::list_installed_apps,
            commands::installer::get_installed_app_details,
            commands::installer::uninstall_installed_app,
            commands::installer::complete_install,
            commands::installer::launch_installed_app,
            commands::installer::create_builder_session,
            commands::installer::open_builder_package,
            commands::installer::stage_builder_files,
            commands::installer::save_builder_session,
            commands::installer::save_builder_session_as,
            commands::installer::discard_builder_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
