import { invoke } from "@tauri-apps/api/core";
import type {
  InstallPreview,
  InstalledApp,
  InstalledAppDetails,
  InstallerContext,
  PackageInfo,
  PreflightCheckResult,
  SystemInfo,
  UninstallResult,
  UpdateCheckResult,
} from "../../types/app";

export const getInstallerContext = () => invoke<InstallerContext>("get_installer_context");

export const getStartupPackageArg = () => invoke<string | null>("get_startup_package_arg");

export const inspectPackage = (packageFile: string) => invoke<PackageInfo>("inspect_package", { packageFile });

export const checkForUpdates = () => invoke<UpdateCheckResult>("check_for_updates");

export const getSystemInfo = () => invoke<SystemInfo>("get_system_info");

export const getRecentLogs = (limit = 300) => invoke<string>("get_recent_logs", { limit });

export const logUiEvent = (level: "INFO" | "WARN" | "ERROR", message: string) =>
  invoke("log_ui_event", { level, message });

export const clearLogs = () => invoke("clear_logs");

export const listInstalledApps = () => invoke<InstalledApp[]>("list_installed_apps");

export const getInstalledAppDetails = (appId: string) =>
  invoke<InstalledAppDetails>("get_installed_app_details", { appId });

export const uninstallInstalledApp = (appId: string, scope: string, removeUserData: boolean) =>
  invoke<UninstallResult>("uninstall_installed_app", { appId, scope, removeUserData });

export const launchInstalledApp = (appId: string) => invoke("launch_installed_app", { appId });

export const preflightInstallCheck = (appId: string) =>
  invoke<PreflightCheckResult>("preflight_install_check", { appId });

export const createInstallPreview = (packageFile: string, appId: string, scope: string, verifiedPublisher: boolean) =>
  invoke<InstallPreview>("create_install_preview", { packageFile, appId, scope, verifiedPublisher });

export const completeInstall = (packageInfo: PackageInfo, scope: string, destinationPath: string) =>
  invoke<InstalledApp>("complete_install", { packageInfo, scope, destinationPath });

export const applyUpdateAndRestart = (downloadUrl: string, expectedSha256: string) =>
  invoke("apply_update_and_restart", { downloadUrl, expectedSha256 });
