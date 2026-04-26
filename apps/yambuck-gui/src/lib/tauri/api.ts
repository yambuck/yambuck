import { invoke } from "@tauri-apps/api/core";
import type {
  BuilderSessionState,
  BuilderStagedFile,
  InstallDecision,
  InstallPreflightResult,
  InstallOptionSubmission,
  InstallWorkflowSession,
  InstallPreview,
  InstalledApp,
  InstalledAppDetails,
  InstallerContext,
  PreflightCheckResult,
  SystemInfo,
  UninstallResult,
  UpdateCheckResult,
} from "../../types/app";

export const getInstallerContext = () => invoke<InstallerContext>("get_installer_context");

export const getStartupPackageArg = () => invoke<string | null>("get_startup_package_arg");

export const inspectPackageWorkflow = (packageFile: string) =>
  invoke<InstallWorkflowSession>("inspect_package_workflow", { packageFile });

export const validateInstallOptions = (workflowId: string, submissions: InstallOptionSubmission[]) =>
  invoke<InstallOptionSubmission[]>("validate_install_options", { workflowId, submissions });

export const getInstallDecision = (workflowId: string, scope: string) =>
  invoke<InstallDecision>("get_install_decision", { workflowId, scope });

export const discardInstallWorkflow = (workflowId: string) =>
  invoke("discard_install_workflow", { workflowId });

export const checkForUpdates = () => invoke<UpdateCheckResult>("check_for_updates");

export const getSystemInfo = () => invoke<SystemInfo>("get_system_info");

export const getRecentLogs = (limit = 300) => invoke<string>("get_recent_logs", { limit });

export const logUiEvent = (level: "INFO" | "WARN" | "ERROR", message: string) =>
  invoke("log_ui_event", { level, message });

export const clearLogs = () => invoke("clear_logs");

export const openLogsDirectory = () => invoke("open_logs_directory");

export const listInstalledApps = () => invoke<InstalledApp[]>("list_installed_apps");

export const getInstalledAppDetails = (appId: string, scope: string) =>
  invoke<InstalledAppDetails>("get_installed_app_details", { appId, scope });

export const uninstallInstalledApp = (appId: string, scope: string, removeUserData: boolean) =>
  invoke<UninstallResult>("uninstall_installed_app", { appId, scope, removeUserData });

export const launchInstalledApp = (appId: string, scope: string) => invoke("launch_installed_app", { appId, scope });

export const preflightInstallCheck = (appId: string) =>
  invoke<PreflightCheckResult>("preflight_install_check", { appId });

export const evaluateInstallPreflight = (workflowId: string) =>
  invoke<InstallPreflightResult>("evaluate_install_preflight", { workflowId });

export const createInstallPreview = (workflowId: string, scope: string, verifiedPublisher: boolean) =>
  invoke<InstallPreview>("create_install_preview", { workflowId, scope, verifiedPublisher });

export const completeInstall = (
  workflowId: string,
  scope: string,
  destinationPath: string,
  submissions: InstallOptionSubmission[],
  allowDowngrade: boolean,
) => invoke<InstalledApp>("complete_install", { workflowId, scope, destinationPath, submissions, allowDowngrade });

export const applyUpdateAndRestart = (downloadUrl: string, expectedSha256: string) =>
  invoke("apply_update_and_restart", { downloadUrl, expectedSha256 });

export const createBuilderSession = () =>
  invoke<BuilderSessionState>("create_builder_session");

export const openBuilderPackage = (packageFile: string) =>
  invoke<BuilderSessionState>("open_builder_package", { packageFile });

export const stageBuilderFiles = (sessionId: string, files: BuilderStagedFile[]) =>
  invoke("stage_builder_files", { sessionId, files });

export const saveBuilderSession = (sessionId: string, manifestJson: string) =>
  invoke("save_builder_session", { sessionId, manifestJson });

export const saveBuilderSessionAs = (sessionId: string, outputPath: string, manifestJson: string) =>
  invoke("save_builder_session_as", { sessionId, outputPath, manifestJson });

export const discardBuilderSession = (sessionId: string) =>
  invoke("discard_builder_session", { sessionId });
