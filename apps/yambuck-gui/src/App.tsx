import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconBrandGithub } from "@tabler/icons-preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { MetaField } from "./components/ui/MetaField";
import { ToastHost, type ToastItem, type ToastTone } from "./components/ui/ToastHost";
import { WindowControls } from "./components/ui/WindowControls";
import { InstalledAppsPage } from "./features/installed/InstalledAppsPage";
import { InstallerPage } from "./features/installer/InstallerPage";
import { MockPreviewPage } from "./features/mock-preview/MockPreviewPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import {
  applyUpdateAndRestart,
  checkForUpdates as checkForUpdatesApi,
  clearLogs as clearLogsApi,
  completeInstall as completeInstallApi,
  createInstallPreview as createInstallPreviewApi,
  getInstalledAppDetails as getInstalledAppDetailsApi,
  getInstallerContext,
  getRecentLogs,
  getStartupPackageArg,
  getSystemInfo,
  inspectPackage,
  launchInstalledApp as launchInstalledAppApi,
  listInstalledApps as listInstalledAppsApi,
  logUiEvent,
  preflightInstallCheck,
  uninstallInstalledApp as uninstallInstalledAppApi,
} from "./lib/tauri/api";
import type {
  AppPage,
  ExternalPackageOpenPayload,
  InstallPreview,
  InstallScope,
  InstalledApp,
  InstalledAppDetails,
  InstallerContext,
  PackageInfo,
  SettingsTab,
  SystemInfo,
  UninstallResult,
  UpdateCheckResult,
  WizardStep,
} from "./types/app";
import { displayOrFallback, truncateDescription } from "./utils/text";
import { useEscapeKey } from "./useEscapeKey";
import "./App.css";

const EXTERNAL_PACKAGE_OPEN_EVENT = "yambuck://open-package";

function App() {
  const [page, setPage] = useState<AppPage>("installer");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [step, setStep] = useState<WizardStep>("details");
  const [scope, setScope] = useState<InstallScope>("user");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready to install package");
  const [context, setContext] = useState<InstallerContext | null>(null);
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [preview, setPreview] = useState<InstallPreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [logText, setLogText] = useState("");
  const [loadingDebug, setLoadingDebug] = useState(false);
  const [preflightBlockedMessage, setPreflightBlockedMessage] = useState("");
  const [checkingPreflight, setCheckingPreflight] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState<number | null>(null);
  const [screenshotGallery, setScreenshotGallery] = useState<string[]>([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showMockTechnicalDetails, setShowMockTechnicalDetails] = useState(false);
  const [showCompleteTechnicalDetails, setShowCompleteTechnicalDetails] = useState(false);
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [licenseViewer, setLicenseViewer] = useState<{ title: string; text: string } | null>(null);
  const [installedAppDetails, setInstalledAppDetails] = useState<InstalledAppDetails | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<InstalledApp | null>(null);
  const [uninstallStep, setUninstallStep] = useState<"confirm" | "options" | "running" | "result">("confirm");
  const [uninstallRemoveUserData, setUninstallRemoveUserData] = useState(false);
  const [loadingUninstallDetails, setLoadingUninstallDetails] = useState(false);
  const [uninstallDetails, setUninstallDetails] = useState<InstalledAppDetails | null>(null);
  const [uninstallResult, setUninstallResult] = useState<UninstallResult | null>(null);
  const [uninstallError, setUninstallError] = useState("");

  const pushToast = (tone: ToastTone, toastMessage: string, durationMs = 3600) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => [...prev.slice(-2), { id, tone, message: toastMessage }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, durationMs);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const loadContext = async () => {
      try {
        const value = await getInstallerContext();
        setContext(value);
        setScope(value.defaultScope);
      } catch {
        pushToast("error", "Unable to load installer runtime context.");
      }
    };

    void loadContext();
  }, []);

  useEffect(() => {
    const openStartupPackage = async () => {
      try {
        const startupPath = await getStartupPackageArg();
        if (!startupPath) {
          return;
        }
        await loadPackageFromPath(startupPath);
      } catch {
        pushToast("error", "Could not open startup package argument.");
      }
    };

    void openStartupPackage();
  }, []);

  useEffect(() => {
    if (page === "installed") {
      void refreshInstalledApps();
    }
  }, [page]);

  useEffect(() => {
    void checkForUpdates(false);
  }, []);

  useEffect(() => {
    if (page === "settings" && settingsTab === "debug") {
      void loadDebugData();
    }
  }, [page, settingsTab]);

  useEffect(() => {
    const win = getCurrentWindow();
    const syncMaximizeState = async () => {
      try {
        setIsMaximized(await win.isMaximized());
      } catch {
        setIsMaximized(false);
      }
    };

    void syncMaximizeState();

    let detachResizeListener: (() => void) | undefined;
    void win.onResized(async () => {
      await syncMaximizeState();
    }).then((unlisten) => {
      detachResizeListener = unlisten;
    });

    return () => {
      if (detachResizeListener) {
        detachResizeListener();
      }
    };
  }, []);

  const choosePackage = async () => {
    let selected: string | null = null;

    try {
      const value = await open({
        multiple: false,
        filters: [{ name: "Yambuck package", extensions: ["yambuck"] }],
      });
      if (Array.isArray(value)) {
        selected = value[0] ?? null;
      } else {
        selected = value;
      }
    } catch {
      pushToast("error", "Unable to open file picker. Check app permissions and try again.");
      return;
    }

    if (!selected) {
      return;
    }

    await loadPackageFromPath(selected);
  };

  const clearSelectedPackage = useCallback(() => {
    setPackageInfo(null);
    setPreview(null);
    setStep("details");
    setPreflightBlockedMessage("");
    setActiveScreenshotIndex(null);
    setScreenshotGallery([]);
    setShowTechnicalDetails(false);
    setShowCompleteTechnicalDetails(false);
    setLicenseAccepted(false);
    setLicenseViewer(null);
  }, []);

  const closeInstallComplete = useCallback(() => {
    clearSelectedPackage();
    setPage("installed");
  }, [clearSelectedPackage]);

  useEscapeKey(page === "installer" && step === "complete" && packageInfo !== null, closeInstallComplete);

  const openScreenshotModal = (gallery: string[], index: number) => {
    setScreenshotGallery(gallery);
    setActiveScreenshotIndex(index);
  };

  const closeScreenshotModal = () => {
    setActiveScreenshotIndex(null);
    setScreenshotGallery([]);
  };

  const cycleScreenshot = (direction: -1 | 1) => {
    if (screenshotGallery.length === 0 || activeScreenshotIndex === null) {
      return;
    }
    const count = screenshotGallery.length;
    const next = (activeScreenshotIndex + direction + count) % count;
    setActiveScreenshotIndex(next);
  };

  const isInstallFlowLocked = () => {
    if (!packageInfo) {
      return false;
    }

    return step === "trust" || step === "license" || step === "scope" || step === "progress";
  };

  const loadPackageFromPath = async (packageFile: string) => {
    try {
      const inspected = await inspectPackage(packageFile);
      setPackageInfo(inspected);
      setShowTechnicalDetails(false);
      setShowCompleteTechnicalDetails(false);
      setLicenseAccepted(false);
      setLicenseViewer(null);
      setStep("details");
      setPreview(null);
      setPreflightBlockedMessage("");
      setPage("installer");
    } catch {
      pushToast("error", "Unable to open package. Choose a valid .yambuck file.");
    }
  };

  useEffect(() => {
    let detachListener: (() => void) | undefined;

    void listen<ExternalPackageOpenPayload>(EXTERNAL_PACKAGE_OPEN_EVENT, (event) => {
      const packageFile = event.payload?.packageFile;
      if (!packageFile) {
        return;
      }

      if (isInstallFlowLocked()) {
        pushToast("warning", "Finish or cancel the current install before opening another package.");
        return;
      }

      void loadPackageFromPath(packageFile);
    }).then((unlisten) => {
      detachListener = unlisten;
    });

    return () => {
      if (detachListener) {
        detachListener();
      }
    };
  }, [step, packageInfo]);

  const checkForUpdates = async (showNoUpdateMessage: boolean) => {
    if (checkingUpdates) {
      return;
    }

    setCheckingUpdates(true);
    try {
      const result = await checkForUpdatesApi();
      setUpdateResult(result);
      setLastCheckedAt(Date.now());

      if (showNoUpdateMessage) {
        setIsUpdateModalOpen(true);
      }
    } catch {
      pushToast("error", "Unable to check for updates right now.");
    } finally {
      setCheckingUpdates(false);
    }
  };

  const relativeLastChecked = () => {
    if (!lastCheckedAt) {
      return "Not checked yet";
    }
    const elapsed = Date.now() - lastCheckedAt;
    if (elapsed < 60_000) {
      return "Just now";
    }
    const minutes = Math.floor(elapsed / 60_000);
    return `${minutes}m ago`;
  };

  const loadDebugData = async () => {
    setLoadingDebug(true);
    try {
      const [info, logs] = await Promise.all([
        getSystemInfo(),
        getRecentLogs(300),
      ]);
      setSystemInfo(info);
      setLogText(logs);
    } catch {
      pushToast("error", "Unable to load debug data.");
    } finally {
      setLoadingDebug(false);
    }
  };

  const copyText = async (value: string, successMessage: string) => {
    if (!value.trim()) {
      pushToast("warning", "Nothing to copy yet.");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      pushToast("success", successMessage);
      await logUiEvent("INFO", successMessage);
    } catch {
      pushToast("error", "Copy failed.");
    }
  };

  const copySystemInfo = async () => {
    if (!systemInfo) {
      pushToast("warning", "System info not loaded yet.");
      return;
    }

    const lines = [
      `Yambuck v${systemInfo.appVersion}`,
      `OS: ${systemInfo.os}`,
      `Arch: ${systemInfo.arch}`,
      `Kernel: ${systemInfo.kernelVersion}`,
      `Distro: ${systemInfo.distro}`,
      `Desktop: ${systemInfo.desktopEnvironment}`,
      `Session: ${systemInfo.sessionType}`,
      `Install path: ${systemInfo.installPath}`,
      `Update feed: ${systemInfo.updateFeedUrl}`,
    ];

    await copyText(lines.join("\n"), "System info copied.");
  };

  const copyLogs = async () => {
    await copyText(logText, "Logs copied.");
  };

  const handleClearLogs = async () => {
    try {
      await clearLogsApi();
      setLogText("");
      pushToast("info", "Logs cleared.");
    } catch {
      pushToast("error", "Unable to clear logs.");
    }
  };

  const refreshInstalledApps = async () => {
    setLoadingInstalled(true);
    try {
      const apps = await listInstalledAppsApi();
      setInstalledApps(apps);
    } catch {
      pushToast("error", "Unable to load installed apps list.");
    } finally {
      setLoadingInstalled(false);
    }
  };

  const openUninstallWizard = (app: InstalledApp) => {
    setUninstallTarget(app);
    setUninstallStep("confirm");
    setUninstallRemoveUserData(false);
    setLoadingUninstallDetails(true);
    setUninstallResult(null);
    setUninstallError("");
    setUninstallDetails(null);

    void getInstalledAppDetailsApi(app.appId).then((details) => {
      setUninstallDetails(details);
    }).catch(() => {
      setUninstallDetails(null);
    }).finally(() => {
      setLoadingUninstallDetails(false);
    });
  };

  const closeUninstallWizard = () => {
    if (uninstallStep === "running") {
      return;
    }
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

    try {
      const result = await uninstallInstalledAppApi(
        uninstallTarget.appId,
        uninstallTarget.installScope,
        uninstallRemoveUserData,
      );

      setUninstallResult(result);
      setUninstallStep("result");
      if (result.warnings.length > 0) {
        pushToast("warning", `${uninstallTarget.displayName} removed with warnings.`);
      } else {
        pushToast("success", `${uninstallTarget.displayName} removed.`);
      }
      await refreshInstalledApps();
    } catch (error) {
      const message = typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : `Failed to uninstall ${uninstallTarget.displayName}.`;
      setUninstallError(message);
      setUninstallStep("result");
      pushToast("error", `Failed to uninstall ${uninstallTarget.displayName}.`);
    }
  };

  const launchInstalledApp = async (app: InstalledApp) => {
    try {
      await launchInstalledAppApi(app.appId);
      pushToast("success", `Launching ${app.displayName}.`);
    } catch {
      pushToast("error", `Unable to launch ${app.displayName}.`);
    }
  };

  const handleContinueFromDetails = async () => {
    if (!packageInfo) {
      pushToast("warning", "Choose a .yambuck package first.");
      return;
    }

    setCheckingPreflight(true);
    try {
      const result = await preflightInstallCheck(packageInfo.appId);

      if (result.status === "external_conflict") {
        setPreflightBlockedMessage(result.message);
        pushToast("error", result.message, 5200);
        return;
      }

      setPreflightBlockedMessage("");

      if (result.status === "managed_existing") {
        pushToast("info", "Existing Yambuck-managed install detected. Proceeding with replace.");
      }

      setStep("trust");
    } catch {
      pushToast("error", "Could not run install safety checks.");
    } finally {
      setCheckingPreflight(false);
    }
  };

  const continueFromTrustStep = () => {
    if (!packageInfo) {
      return;
    }
    if (packageInfo.requiresLicenseAcceptance) {
      setStep("license");
      return;
    }
    setStep("scope");
  };

  const openLicenseViewer = (title: string, text: string) => {
    setLicenseViewer({ title, text });
  };

  const closeLicenseViewer = () => {
    setLicenseViewer(null);
  };

  const closeInstalledAppDetails = () => {
    setInstalledAppDetails(null);
  };

  const openInstalledAppDetails = async (app: InstalledApp) => {
    try {
      const details = await getInstalledAppDetailsApi(app.appId);
      setInstalledAppDetails(details);
    } catch {
      pushToast("error", `Could not load archived package details for ${app.displayName}.`);
    }
  };

  const startInstall = async () => {
    if (!packageInfo) {
      pushToast("warning", "Choose a .yambuck package before installing.");
      return;
    }

    const selectedPackage = packageInfo;

    if (selectedPackage.requiresLicenseAcceptance && !licenseAccepted) {
      pushToast("warning", "You must accept the license before installing.");
      setStep("license");
      return;
    }

    setPreflightBlockedMessage("");

    try {
      const preflight = await preflightInstallCheck(selectedPackage.appId);
      if (preflight.status === "external_conflict") {
        setPreflightBlockedMessage(preflight.message);
        pushToast("error", preflight.message, 5200);
        return;
      }
    } catch {
      pushToast("error", "Could not verify install ownership safety.");
      return;
    }

    setIsBusy(true);
    setStep("progress");
    setProgress(0);
    setStatusText("Preparing install preview");

    const verifiedPublisher = packageInfo.trustStatus === "verified";
    let installPreview: InstallPreview;

    try {
      installPreview = await createInstallPreviewApi(
        selectedPackage.packageFile,
        selectedPackage.appId,
        scope,
        verifiedPublisher,
      );
      setPreview(installPreview);
    } catch {
      pushToast("error", "Failed to generate install preview.");
      setIsBusy(false);
      setStep("scope");
      return;
    }

    let nextProgress = 0;
    const timer = window.setInterval(() => {
      nextProgress += 10;
      setProgress(nextProgress);
      if (nextProgress <= 40) {
        setStatusText("Validating package integrity");
      } else if (nextProgress <= 80) {
        setStatusText("Installing application files");
      } else {
        setStatusText("Finalizing desktop integration");
      }
      if (nextProgress >= 100) {
        window.clearInterval(timer);
        setStatusText("Install complete");
        setIsBusy(false);
        setStep("complete");
        void completeInstall(selectedPackage, installPreview, scope);
      }
    }, 220);
  };

  const completeInstall = async (
    selectedPackage: PackageInfo,
    installPreview: InstallPreview,
    installScope: InstallScope,
  ) => {
    try {
      await completeInstallApi(selectedPackage, installScope, installPreview.destinationPath);
      pushToast("success", `${selectedPackage.displayName} installed.`);
      await refreshInstalledApps();
    } catch {
      pushToast("error", "Install finished with issues. Could not update installed apps index.");
    }
  };

  const launchCurrentPackage = async () => {
    if (!packageInfo) {
      pushToast("warning", "No package selected to launch.");
      return;
    }

    await launchInstalledApp({
      appId: packageInfo.appId,
      displayName: packageInfo.displayName,
      version: packageInfo.version,
      installScope: scope,
      installedAt: "",
    });
  };

  const handleTitlebarMouseDown = async (event: any) => {
    if (event.buttons !== 1) {
      return;
    }

    if (event.target?.closest("button, a, input, [data-no-drag='true']")) {
      return;
    }

    try {
      await getCurrentWindow().startDragging();
    } catch {
      // no-op if drag is unavailable
    }
  };

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch {
      pushToast("error", "Unable to minimize window.");
    }
  };

  const handleToggleMaximize = async () => {
    try {
      const win = getCurrentWindow();
      const currentlyMaximized = await win.isMaximized();
      if (currentlyMaximized) {
        await win.unmaximize();
        setIsMaximized(false);
      } else {
        await win.maximize();
        setIsMaximized(true);
      }
    } catch {
      pushToast("error", "Unable to resize window.");
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch {
      pushToast("error", "Unable to close window.");
    }
  };

  const closeUpdateModal = () => setIsUpdateModalOpen(false);

  const handleUpdateAndRestart = async () => {
    if (!updateResult) {
      return;
    }

    if (!updateResult.downloadUrl || !updateResult.sha256) {
      pushToast("error", "Update metadata is incomplete. Please try again later.");
      return;
    }

    setApplyingUpdate(true);
    pushToast("info", `Applying update ${updateResult.latestVersion}. Yambuck will restart.`);

    try {
      await applyUpdateAndRestart(updateResult.downloadUrl, updateResult.sha256);
      await getCurrentWindow().close();
    } catch {
      pushToast("error", "Unable to apply update automatically. Please retry or use website installer.");
      setApplyingUpdate(false);
    }
  };

  const hasUpdateAvailable = updateResult?.updateAvailable === true;

  const renderInstallStep = () => {
    return (
      <InstallerPage
        step={step}
        packageInfo={packageInfo}
        checkingPreflight={checkingPreflight}
        preflightBlockedMessage={preflightBlockedMessage}
        showTechnicalDetails={showTechnicalDetails}
        showCompleteTechnicalDetails={showCompleteTechnicalDetails}
        licenseAccepted={licenseAccepted}
        scope={scope}
        statusText={statusText}
        progress={progress}
        isBusy={isBusy}
        preview={preview}
        onChoosePackage={() => void choosePackage()}
        onContinueFromDetails={() => void handleContinueFromDetails()}
        onClearSelectedPackage={clearSelectedPackage}
        onOpenScreenshotModal={openScreenshotModal}
        onOpenLicenseViewer={openLicenseViewer}
        onToggleTechnicalDetails={() => setShowTechnicalDetails((prev) => !prev)}
        onSetStep={setStep}
        onContinueFromTrustStep={continueFromTrustStep}
        onSetLicenseAccepted={setLicenseAccepted}
        onSetScope={setScope}
        onStartInstall={() => void startInstall()}
        onCloseInstallComplete={closeInstallComplete}
        onToggleCompleteTechnicalDetails={() => setShowCompleteTechnicalDetails((prev) => !prev)}
        onLaunchCurrentPackage={() => void launchCurrentPackage()}
      />
    );
  };

  const renderInstalledApps = () => (
    <InstalledAppsPage
      loadingInstalled={loadingInstalled}
      installedApps={installedApps}
      onRefresh={() => void refreshInstalledApps()}
      onOpenDetails={(app) => void openInstalledAppDetails(app)}
      onLaunch={(app) => void launchInstalledApp(app)}
      onUninstall={(app) => openUninstallWizard(app)}
    />
  );

  const renderMockPreviewPage = () => {
    return (
      <MockPreviewPage
        showMockTechnicalDetails={showMockTechnicalDetails}
        onToggleTechnicalDetails={() => setShowMockTechnicalDetails((prev) => !prev)}
        onOpenScreenshot={(gallery, index) => openScreenshotModal(gallery, index)}
        onOpenLicense={(title, text) => openLicenseViewer(title, text)}
        onBackToSettings={() => setPage("settings")}
        onToastInfo={(message) => pushToast("info", message)}
      />
    );
  };

  const renderSettingsPage = () => (
    <SettingsPage
      settingsTab={settingsTab}
      onChangeSettingsTab={setSettingsTab}
      checkingUpdates={checkingUpdates}
      onCheckForUpdates={() => void checkForUpdates(true)}
      loadingDebug={loadingDebug}
      systemInfo={systemInfo}
      logText={logText}
      onLoadDebugData={() => void loadDebugData()}
      onCopySystemInfo={() => void copySystemInfo()}
      onOpenMockPreview={() => setPage("mockPreview")}
      onCopyLogs={() => void copyLogs()}
      onClearLogs={() => void handleClearLogs()}
    />
  );

  return (
    <main class="app-shell">
      <header class="topbar" onMouseDown={(event) => void handleTitlebarMouseDown(event)}>
        <div class="topbar-left" data-no-drag="true">
          <button
            class={`toggle-pill ${page === "installer" ? "active" : ""}`}
            onClick={() => setPage("installer")}
          >
            Installer
          </button>
          <button
            class={`toggle-pill ${page === "installed" ? "active" : ""}`}
            onClick={() => setPage("installed")}
          >
            Installed Apps
          </button>
        </div>
        <div class="topbar-title">
          {page === "installer"
            ? "Yambuck Installer"
            : page === "installed"
              ? "Installed Apps"
              : page === "settings"
                ? "Settings"
                : "Mock Preview"}
        </div>
        <WindowControls
          settingsActive={page === "settings"}
          isMaximized={isMaximized}
          onOpenSettings={() => {
            setPage("settings");
            setSettingsTab("general");
          }}
          onMinimize={() => void handleMinimize()}
          onToggleMaximize={() => void handleToggleMaximize()}
          onClose={() => void handleClose()}
        />
      </header>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      <section class="content-scroll" data-no-drag="true">
        {page === "installer"
          ? renderInstallStep()
          : page === "installed"
            ? renderInstalledApps()
            : page === "settings"
              ? renderSettingsPage()
              : renderMockPreviewPage()}
      </section>

      {isUpdateModalOpen && updateResult ? (
        <div class="modal-overlay" data-no-drag="true" onClick={() => closeUpdateModal()}>
          <section class="modal-card" onClick={(event) => event.stopPropagation()}>
            <h2>{updateResult.updateAvailable ? "Update available" : "You're up to date"}</h2>
            <p class="subtitle">{`Current: v${updateResult.currentVersion}`}</p>
            <p class="subtitle">{`Latest: v${updateResult.latestVersion}`}</p>
            <p class="subtitle">{`Last checked: ${relativeLastChecked()}`}</p>
            <p class="subtitle">
              {updateResult.updateAvailable
                ? "A new Yambuck version is ready. You can review notes, then update and restart."
                : "No update is needed right now."}
            </p>
            <div class="update-actions">
              {updateResult.updateAvailable && updateResult.notesUrl ? (
                <a
                  class="button ghost"
                  href={updateResult.notesUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Release notes
                </a>
              ) : null}
              <button class="button ghost" onClick={() => closeUpdateModal()}>
                {updateResult.updateAvailable ? "Later" : "Close"}
              </button>
              {updateResult.updateAvailable ? (
                <button
                  class="button primary"
                  onClick={() => void handleUpdateAndRestart()}
                  disabled={applyingUpdate}
                >
                  {applyingUpdate ? "Applying..." : "Update and restart"}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {licenseViewer ? (
        <div class="modal-overlay" data-no-drag="true" onClick={() => closeLicenseViewer()}>
          <section class="modal-card license-modal-card" onClick={(event) => event.stopPropagation()}>
            <div class="screenshot-modal-toolbar">
              <span>{licenseViewer.title}</span>
              <button class="button ghost" onClick={() => closeLicenseViewer()}>Close</button>
            </div>
            <pre class="license-modal-text">{licenseViewer.text}</pre>
          </section>
        </div>
      ) : null}

      {installedAppDetails ? (
        <div class="modal-overlay" data-no-drag="true" onClick={() => closeInstalledAppDetails()}>
          <section class="modal-card installed-review-modal" onClick={(event) => event.stopPropagation()}>
            <div class="screenshot-modal-toolbar">
              <span>{`Installed package review: ${installedAppDetails.displayName}`}</span>
              <button class="button ghost" onClick={() => closeInstalledAppDetails()}>Close</button>
            </div>

            <p class="subtitle">Review archived package details from the package snapshot Yambuck kept at install time.</p>

            <div class="package-overview installed-review-overview">
              {installedAppDetails.packageInfo.iconDataUrl ? (
                <img class="package-icon" src={installedAppDetails.packageInfo.iconDataUrl} alt={`${installedAppDetails.displayName} icon`} />
              ) : (
                <div class="package-icon placeholder">No icon</div>
              )}
              <div>
                <p class="subtitle package-description">{truncateDescription(installedAppDetails.packageInfo.description)}</p>
              </div>
            </div>

            {installedAppDetails.packageInfo.screenshotDataUrls.length > 0 ? (
              <div class="screenshot-strip" data-no-drag="true">
                {installedAppDetails.packageInfo.screenshotDataUrls.map((source, index) => (
                  <button
                    key={`installed-shot-${installedAppDetails.appId}-${index}`}
                    class="screenshot-tile"
                    onClick={() => openScreenshotModal(installedAppDetails.packageInfo.screenshotDataUrls, index)}
                    title={`Open screenshot ${index + 1}`}
                  >
                    <img src={source} alt={`Installed screenshot ${index + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}

            <dl class="meta-grid compact">
              <MetaField
                label="Publisher"
                tooltip="The team or company that published this app."
                value={installedAppDetails.packageInfo.publisher}
              />
              <MetaField
                label="Version"
                tooltip="The app version from the archived package manifest."
                value={installedAppDetails.version}
              />
              <MetaField
                label="Installed"
                tooltip="Unix timestamp when Yambuck registered this installation."
                value={installedAppDetails.installedAt}
              />
              <MetaField
                label="Scope"
                tooltip="Install scope used for this app."
                value={installedAppDetails.installScope}
              />
              <MetaField
                label="License"
                tooltip="The legal terms bundled in the archived package copy."
                value={
                  <span class="meta-inline-actions">
                    <span>{displayOrFallback(installedAppDetails.packageInfo.license)}</span>
                    {installedAppDetails.packageInfo.licenseText ? (
                      <button
                        class="button ghost inline"
                        type="button"
                        onClick={() =>
                          openLicenseViewer(
                            `${installedAppDetails.displayName} License`,
                            installedAppDetails.packageInfo.licenseText!,
                          )
                        }
                      >
                        View license
                      </button>
                    ) : null}
                  </span>
                }
              />
              <MetaField
                label="Trust"
                tooltip="Trust status captured from the archived manifest."
                value={installedAppDetails.packageInfo.trustStatus}
              />
            </dl>

            {installedAppDetails.packageInfo.longDescription?.trim() ? (
              <section class="meta-section long-description installed-review-long-description">
                <div class="meta-section-header">
                  <h2>About this app</h2>
                </div>
                <p>{installedAppDetails.packageInfo.longDescription}</p>
              </section>
            ) : null}
          </section>
        </div>
      ) : null}

      {uninstallTarget ? (
        <div class="modal-overlay" data-no-drag="true" onClick={() => closeUninstallWizard()}>
          <section class="modal-card" onClick={(event) => event.stopPropagation()}>
            {uninstallStep === "confirm" ? (
              <>
                <h2>{`Uninstall ${uninstallTarget.displayName}?`}</h2>
                <p class="subtitle">This removes the app from Yambuck and deletes installed app files.</p>
                <p class="subtitle">{`Scope: ${uninstallTarget.installScope}`}</p>
                <div class="update-actions">
                  <button class="button ghost" onClick={() => closeUninstallWizard()}>Cancel</button>
                  <button class="button primary" onClick={() => setUninstallStep("options")}>Continue</button>
                </div>
              </>
            ) : null}

            {uninstallStep === "options" ? (
              <>
                <h2>Uninstall options</h2>
                <p class="subtitle">App files will be removed. Choose whether to also remove app data paths.</p>
                <label class="checkbox-row">
                  <input
                    type="checkbox"
                    checked={uninstallRemoveUserData}
                    onChange={(event) => setUninstallRemoveUserData((event.currentTarget as HTMLInputElement).checked)}
                  />
                  Remove user data and settings paths from package manifest
                </label>
                {loadingUninstallDetails ? <p class="subtitle">Loading package metadata...</p> : null}
                {uninstallDetails?.packageInfo ? (
                  <ul class="system-info-list">
                    {uninstallDetails.packageInfo.configPath ? <li>Config: <code>{uninstallDetails.packageInfo.configPath}</code></li> : null}
                    {uninstallDetails.packageInfo.cachePath ? <li>Cache: <code>{uninstallDetails.packageInfo.cachePath}</code></li> : null}
                    {uninstallDetails.packageInfo.tempPath ? <li>Temp: <code>{uninstallDetails.packageInfo.tempPath}</code></li> : null}
                  </ul>
                ) : null}
                <div class="update-actions">
                  <button class="button ghost" onClick={() => setUninstallStep("confirm")}>Back</button>
                  <button class="button primary" onClick={() => void runUninstall()}>Uninstall</button>
                </div>
              </>
            ) : null}

            {uninstallStep === "running" ? (
              <>
                <h2>Uninstalling...</h2>
                <p class="subtitle">Removing application files and updating installed app index.</p>
              </>
            ) : null}

            {uninstallStep === "result" ? (
              <>
                <h2>{uninstallError ? "Uninstall failed" : "Uninstall complete"}</h2>
                {uninstallError ? <p class="subtitle">{uninstallError}</p> : null}
                {uninstallResult?.warnings.length ? (
                  <>
                    <p class="subtitle">Completed with warnings:</p>
                    <ul class="system-info-list">
                      {uninstallResult.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <div class="update-actions">
                  <button class="button primary" onClick={() => closeUninstallWizard()}>Close</button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeScreenshotIndex !== null && screenshotGallery.length > 0 ? (
        <div class="screenshot-modal-overlay" data-no-drag="true" onClick={() => closeScreenshotModal()}>
          <section class="screenshot-modal-card" onClick={(event) => event.stopPropagation()}>
            <div class="screenshot-modal-toolbar">
              <span>{`Screenshot ${activeScreenshotIndex + 1} of ${screenshotGallery.length}`}</span>
              <button class="button ghost" onClick={() => closeScreenshotModal()}>Close</button>
            </div>
            <img
              class="screenshot-modal-image"
              src={screenshotGallery[activeScreenshotIndex]}
              alt={`Screenshot ${activeScreenshotIndex + 1}`}
            />
            {screenshotGallery.length > 1 ? (
              <div class="screenshot-modal-controls">
                <button class="button ghost" onClick={() => cycleScreenshot(-1)}>Previous</button>
                <button class="button ghost" onClick={() => cycleScreenshot(1)}>Next</button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      <footer class="app-footer" data-no-drag="true">
        <div class="footer-meta">
          <span class="footer-version">
            {context ? `Yambuck v${context.appVersion}` : "Yambuck"}
          </span>
          {hasUpdateAvailable ? (
            <button class="footer-action update" onClick={() => setIsUpdateModalOpen(true)}>
              Update available
            </button>
          ) : null}
        </div>
        <a class="footer-link" href="https://github.com/yambuck/yambuck" target="_blank" rel="noreferrer">
          <IconBrandGithub size={16} />
          GitHub
        </a>
      </footer>
    </main>
  );
}

export default App;
