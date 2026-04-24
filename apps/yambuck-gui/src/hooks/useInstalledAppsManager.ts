import { useState } from "preact/hooks";
import {
  getInstalledAppDetails as getInstalledAppDetailsApi,
  launchInstalledApp as launchInstalledAppApi,
  listInstalledApps as listInstalledAppsApi,
  uninstallInstalledApp as uninstallInstalledAppApi,
} from "../lib/tauri/api";
import { logUiAction, logUiError } from "../lib/ui-log";
import type {
  InstallScope,
  InstalledApp,
  InstalledAppDetails,
  UninstallResult,
  UninstallStep,
} from "../types/app";

type UseInstalledAppsManagerOptions = {
  onToast: (tone: "info" | "success" | "warning" | "error", message: string, durationMs?: number) => void;
};

export const useInstalledAppsManager = ({ onToast }: UseInstalledAppsManagerOptions) => {
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [loadingInstalledAppDetails, setLoadingInstalledAppDetails] = useState(false);
  const [installedAppDetails, setInstalledAppDetails] = useState<InstalledAppDetails | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<InstalledApp | null>(null);
  const [uninstallStep, setUninstallStep] = useState<UninstallStep>("confirm");
  const [uninstallRemoveUserData, setUninstallRemoveUserData] = useState(false);
  const [loadingUninstallDetails, setLoadingUninstallDetails] = useState(false);
  const [uninstallDetails, setUninstallDetails] = useState<InstalledAppDetails | null>(null);
  const [uninstallResult, setUninstallResult] = useState<UninstallResult | null>(null);
  const [uninstallError, setUninstallError] = useState("");

  const refreshInstalledApps = async () => {
    setLoadingInstalled(true);
    logUiAction("installed-refresh-start");
    try {
      const apps = await listInstalledAppsApi();
      setInstalledApps(apps);
      logUiAction("installed-refresh-success", { count: apps.length });
    } catch {
      logUiError("installed-refresh-failed");
      onToast("error", "Unable to load installed apps list.");
    } finally {
      setLoadingInstalled(false);
    }
  };

  const openInstalledAppDetails = async (app: InstalledApp) => {
    setLoadingInstalledAppDetails(true);
    logUiAction("installed-review-open-start", {
      appId: app.appId,
      scope: app.installScope,
    });
    try {
      const details = await getInstalledAppDetailsApi(app.appId, app.installScope);
      setInstalledAppDetails(details);
      logUiAction("installed-review-open-success", {
        appId: app.appId,
        scope: app.installScope,
      });
      return details;
    } catch {
      setInstalledAppDetails(null);
      logUiError("installed-review-open-failed", {
        appId: app.appId,
        scope: app.installScope,
      });
      onToast("error", `Could not load archived package details for ${app.displayName}.`);
      return null;
    } finally {
      setLoadingInstalledAppDetails(false);
    }
  };

  const openInstalledAppDetailsByIdentity = async (
    appId: string,
    installScope: InstallScope,
    appLabel: string,
  ) => {
    setLoadingInstalledAppDetails(true);
    logUiAction("installed-review-open-start", { appId, scope: installScope });
    try {
      const details = await getInstalledAppDetailsApi(appId, installScope);
      setInstalledAppDetails(details);
      logUiAction("installed-review-open-success", { appId, scope: installScope });
      return details;
    } catch {
      setInstalledAppDetails(null);
      logUiError("installed-review-open-failed", { appId, scope: installScope });
      onToast("error", `Could not load archived package details for ${appLabel}.`);
      return null;
    } finally {
      setLoadingInstalledAppDetails(false);
    }
  };

  const closeInstalledAppDetails = () => {
    setLoadingInstalledAppDetails(false);
    setInstalledAppDetails(null);
  };

  const openUninstallWizard = (app: InstalledApp) => {
    logUiAction("uninstall-wizard-open", {
      appId: app.appId,
      scope: app.installScope,
    });
    setUninstallTarget(app);
    setUninstallStep("confirm");
    setUninstallRemoveUserData(false);
    setLoadingUninstallDetails(true);
    setUninstallResult(null);
    setUninstallError("");
    setUninstallDetails(null);

    void getInstalledAppDetailsApi(app.appId, app.installScope)
      .then((details) => {
        setUninstallDetails(details);
      })
      .catch(() => {
        setUninstallDetails(null);
      })
      .finally(() => {
        setLoadingUninstallDetails(false);
      });
  };

  const closeUninstallWizard = () => {
    if (uninstallStep === "running") {
      return;
    }
    logUiAction("uninstall-wizard-close", {
      appId: uninstallTarget?.appId ?? "none",
      scope: uninstallTarget?.installScope ?? "none",
      step: uninstallStep,
    });
    setUninstallTarget(null);
    setUninstallResult(null);
    setUninstallError("");
    setUninstallDetails(null);
  };

  const runUninstall = async () => {
    if (!uninstallTarget) {
      return;
    }

    setUninstallStep("running");
    setUninstallError("");
    logUiAction("uninstall-attempt-start", {
      appId: uninstallTarget.appId,
      scope: uninstallTarget.installScope,
      removeUserData: uninstallRemoveUserData,
    });

    try {
      const result = await uninstallInstalledAppApi(
        uninstallTarget.appId,
        uninstallTarget.installScope,
        uninstallRemoveUserData,
      );

      setUninstallResult(result);
      setUninstallStep("result");
      logUiAction("uninstall-attempt-success", {
        appId: uninstallTarget.appId,
        scope: uninstallTarget.installScope,
        warnings: result.warnings.length,
        removedAppFiles: result.removedAppFiles,
        removedUserData: result.removedUserData,
      });
      if (result.warnings.length > 0) {
        onToast("warning", `${uninstallTarget.displayName} removed with warnings.`);
      } else {
        onToast("success", `${uninstallTarget.displayName} removed.`);
      }
      await refreshInstalledApps();
    } catch (error) {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : `Failed to uninstall ${uninstallTarget.displayName}.`;
      setUninstallError(message);
      setUninstallStep("result");
      logUiError("uninstall-attempt-failed", {
        appId: uninstallTarget.appId,
        scope: uninstallTarget.installScope,
        removeUserData: uninstallRemoveUserData,
        reason: message,
      });
      onToast("error", `Failed to uninstall ${uninstallTarget.displayName}.`);
    }
  };

  const launchInstalledApp = async (app: InstalledApp) => {
    logUiAction("installed-launch-start", { appId: app.appId, scope: app.installScope });
    try {
      await launchInstalledAppApi(app.appId, app.installScope);
      logUiAction("installed-launch-success", { appId: app.appId, scope: app.installScope });
      onToast("success", `Launching ${app.displayName}.`);
    } catch {
      logUiError("installed-launch-failed", { appId: app.appId, scope: app.installScope });
      onToast("error", `Unable to launch ${app.displayName}.`);
    }
  };

  return {
    installedApps,
    loadingInstalled,
    loadingInstalledAppDetails,
    refreshInstalledApps,
    installedAppDetails,
    openInstalledAppDetails,
    openInstalledAppDetailsByIdentity,
    closeInstalledAppDetails,
    launchInstalledApp,
    uninstallTarget,
    uninstallStep,
    setUninstallStep,
    uninstallRemoveUserData,
    setUninstallRemoveUserData,
    loadingUninstallDetails,
    uninstallDetails,
    uninstallResult,
    uninstallError,
    openUninstallWizard,
    closeUninstallWizard,
    runUninstall,
  };
};
