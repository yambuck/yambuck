import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconBrandGithub, IconSettings } from "@tabler/icons-preact";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./App.css";

type WizardStep = "details" | "trust" | "scope" | "progress" | "complete";
type InstallScope = "user" | "system";
type AppPage = "installer" | "installed" | "settings" | "mockPreview";
type SettingsTab = "general" | "debug";
type ToastTone = "info" | "success" | "warning" | "error";

type InstallerContext = {
  productName: string;
  appVersion: string;
  platform: string;
  defaultScope: InstallScope;
  trustMode: string;
};

type PackageInfo = {
  packageFile: string;
  fileName: string;
  displayName: string;
  appId: string;
  appUuid: string;
  version: string;
  manifestVersion: string;
  publisher: string;
  description: string;
  longDescription?: string;
  entrypoint: string;
  iconPath: string;
  iconDataUrl?: string;
  screenshots: string[];
  screenshotDataUrls: string[];
  homepageUrl?: string;
  supportUrl?: string;
  license?: string;
  packageUuid: string;
  trustStatus: string;
};

type InstallPreview = {
  packageFile: string;
  installScope: InstallScope;
  destinationPath: string;
  trustStatus: string;
};

type InstalledApp = {
  appId: string;
  displayName: string;
  version: string;
  installScope: InstallScope;
  installedAt: string;
};

type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  channel: string;
  notesUrl?: string;
  downloadUrl?: string;
  sha256?: string;
};

type SystemInfo = {
  appVersion: string;
  os: string;
  arch: string;
  kernelVersion: string;
  distro: string;
  desktopEnvironment: string;
  sessionType: string;
  installPath: string;
  updateFeedUrl: string;
};

type PreflightCheckResult = {
  status: "ok" | "managed_existing" | "external_conflict";
  message: string;
};

type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

type MetaFieldProps = {
  label: string;
  tooltip: string;
  value: ComponentChildren;
};

const MetaField = ({ label, tooltip, value }: MetaFieldProps) => (
  <div>
    <dt>
      <span class="meta-term" tabIndex={0}>
        {label}
        <span class="meta-help" aria-hidden="true">?</span>
        <span class="meta-tooltip" role="tooltip">{tooltip}</span>
      </span>
    </dt>
    <dd>{value}</dd>
  </div>
);

const MOCK_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="22" fill="#0e2b43"/><circle cx="64" cy="50" r="24" fill="#63d8ff"/><rect x="28" y="82" width="72" height="16" rx="8" fill="#5bf0c5"/></svg>',
  );

const MOCK_SHOT_A =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600" viewBox="0 0 900 1600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#123e63"/><stop offset="1" stop-color="#09172a"/></linearGradient></defs><rect width="900" height="1600" fill="url(#g)"/><rect x="70" y="120" width="760" height="220" rx="22" fill="#1a527f"/><rect x="70" y="390" width="760" height="900" rx="22" fill="#113452"/><rect x="100" y="440" width="700" height="54" rx="10" fill="#5ee7c2"/><rect x="100" y="530" width="700" height="54" rx="10" fill="#4bb9ff"/></svg>',
  );

const MOCK_SHOT_B =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1700" viewBox="0 0 1000 1700"><rect width="1000" height="1700" fill="#0a1f33"/><rect x="90" y="110" width="820" height="220" rx="20" fill="#194767"/><rect x="90" y="380" width="820" height="1180" rx="20" fill="#0f2d47"/><circle cx="180" cy="200" r="42" fill="#63d8ff"/><rect x="250" y="170" width="560" height="54" rx="12" fill="#5bf0c5"/><rect x="250" y="244" width="420" height="36" rx="10" fill="#88c9f8"/></svg>',
  );

const MOCK_SHOT_C =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1600" viewBox="0 0 960 1600"><rect width="960" height="1600" fill="#09192a"/><rect x="60" y="110" width="840" height="190" rx="18" fill="#1b4f75"/><rect x="60" y="340" width="840" height="1180" rx="18" fill="#10314c"/><rect x="100" y="400" width="760" height="70" rx="12" fill="#63d8ff"/><rect x="100" y="500" width="620" height="40" rx="10" fill="#7abef0"/><rect x="100" y="570" width="710" height="40" rx="10" fill="#5be7bf"/></svg>',
  );

const MOCK_SHOT_D =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="980" height="1640" viewBox="0 0 980 1640"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123758"/><stop offset="1" stop-color="#081423"/></linearGradient></defs><rect width="980" height="1640" fill="url(#bg)"/><rect x="72" y="120" width="836" height="240" rx="20" fill="#1b4e72"/><rect x="72" y="400" width="836" height="1130" rx="20" fill="#0f2d46"/><circle cx="160" cy="240" r="38" fill="#5be7bf"/><rect x="230" y="210" width="610" height="48" rx="12" fill="#63d8ff"/><rect x="230" y="276" width="460" height="34" rx="10" fill="#8ec8ee"/></svg>',
  );

const MOCK_SHOT_E =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="940" height="1580" viewBox="0 0 940 1580"><rect width="940" height="1580" fill="#0a2034"/><rect x="64" y="104" width="812" height="210" rx="18" fill="#1a4a70"/><rect x="64" y="350" width="812" height="1166" rx="18" fill="#113450"/><rect x="94" y="420" width="752" height="52" rx="10" fill="#7bd4ff"/><rect x="94" y="498" width="752" height="52" rx="10" fill="#5be7bf"/><rect x="94" y="576" width="520" height="36" rx="10" fill="#8ec8ee"/></svg>',
  );

const MOCK_SHOT_F =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1620" viewBox="0 0 960 1620"><rect width="960" height="1620" fill="#081a2b"/><rect x="72" y="112" width="816" height="212" rx="18" fill="#1d537b"/><rect x="72" y="360" width="816" height="1188" rx="18" fill="#123753"/><rect x="110" y="428" width="740" height="58" rx="10" fill="#63d8ff"/><rect x="110" y="510" width="740" height="58" rx="10" fill="#5be7bf"/><rect x="110" y="592" width="620" height="40" rx="10" fill="#8ec8ee"/></svg>',
  );

const DESCRIPTION_LIMIT = 500;

const truncateDescription = (text: string, maxChars = DESCRIPTION_LIMIT) => {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars).trimEnd()}...`;
};

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
        const value = await invoke<InstallerContext>("get_installer_context");
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
        const startupPath = await invoke<string | null>("get_startup_package_arg");
        if (!startupPath) {
          return;
        }
        await loadPackageFromPath(startupPath, true);
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

    await loadPackageFromPath(selected, false);
  };

  const clearSelectedPackage = () => {
    setPackageInfo(null);
    setPreview(null);
    setStep("details");
    setPreflightBlockedMessage("");
    setActiveScreenshotIndex(null);
    setScreenshotGallery([]);
    setShowTechnicalDetails(false);
  };

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

  const loadPackageFromPath = async (packageFile: string, fromStartup: boolean) => {
    try {
      const inspected = await invoke<PackageInfo>("inspect_package", {
        packageFile,
      });
      setPackageInfo(inspected);
      setShowTechnicalDetails(false);
      setStep("details");
      setPreview(null);
      setPreflightBlockedMessage("");
      if (fromStartup) {
        pushToast("success", `Opened ${inspected.fileName} from file association.`);
      } else {
        pushToast("success", `Loaded package ${inspected.fileName}`);
      }
    } catch {
      pushToast("error", "Unable to open package. Choose a valid .yambuck file.");
    }
  };

  const checkForUpdates = async (showNoUpdateMessage: boolean) => {
    if (checkingUpdates) {
      return;
    }

    setCheckingUpdates(true);
    try {
      const result = await invoke<UpdateCheckResult>("check_for_updates");
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
        invoke<SystemInfo>("get_system_info"),
        invoke<string>("get_recent_logs", { limit: 300 }),
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
      await invoke("log_ui_event", { level: "INFO", message: successMessage });
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
      await invoke("clear_logs");
      setLogText("");
      pushToast("info", "Logs cleared.");
    } catch {
      pushToast("error", "Unable to clear logs.");
    }
  };

  const refreshInstalledApps = async () => {
    setLoadingInstalled(true);
    try {
      const apps = await invoke<InstalledApp[]>("list_installed_apps");
      setInstalledApps(apps);
    } catch {
      pushToast("error", "Unable to load installed apps list.");
    } finally {
      setLoadingInstalled(false);
    }
  };

  const uninstallApp = async (app: InstalledApp) => {
    const approved = window.confirm(`Uninstall ${app.displayName}?`);
    if (!approved) {
      return;
    }

    const removeUserData = window.confirm("Also remove user data and settings?");
    try {
      await invoke("uninstall_installed_app", {
        appId: app.appId,
        removeUserData,
      });
      pushToast("success", `${app.displayName} removed.`);
      await refreshInstalledApps();
    } catch {
      pushToast("error", `Failed to uninstall ${app.displayName}.`);
    }
  };

  const handleContinueFromDetails = async () => {
    if (!packageInfo) {
      pushToast("warning", "Choose a .yambuck package first.");
      return;
    }

    setCheckingPreflight(true);
    try {
      const result = await invoke<PreflightCheckResult>("preflight_install_check", {
        appId: packageInfo.appId,
      });

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

  const startInstall = async () => {
    if (!packageInfo) {
      pushToast("warning", "Choose a .yambuck package before installing.");
      return;
    }

    const selectedPackage = packageInfo;
    setPreflightBlockedMessage("");

    try {
      const preflight = await invoke<PreflightCheckResult>("preflight_install_check", {
        appId: selectedPackage.appId,
      });
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
      installPreview = await invoke<InstallPreview>("create_install_preview", {
        packageFile: selectedPackage.packageFile,
        appId: selectedPackage.appId,
        scope,
        verifiedPublisher,
      });
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
      await invoke<InstalledApp>("complete_install", {
        packageInfo: selectedPackage,
        scope: installScope,
        destinationPath: installPreview.destinationPath,
      });
      pushToast("success", `${selectedPackage.displayName} installed.`);
      await refreshInstalledApps();
    } catch {
      pushToast("error", "Install finished with issues. Could not update installed apps index.");
    }
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
      await invoke("apply_update_and_restart", {
        downloadUrl: updateResult.downloadUrl,
        expectedSha256: updateResult.sha256,
      });
      await getCurrentWindow().close();
    } catch {
      pushToast("error", "Unable to apply update automatically. Please retry or use website installer.");
      setApplyingUpdate(false);
    }
  };

  const hasUpdateAvailable = updateResult?.updateAvailable === true;

  const renderInstallStep = () => {
    if (step === "details") {
      return (
        <section class="panel package-panel">
          {packageInfo ? (
            <>
              <div class="details-header">
                <div>
                  <h1>{packageInfo.displayName}</h1>
                  <p class="subtitle">Review package details and install when ready</p>
                </div>
                <div class="details-actions" data-no-drag="true">
                  <button
                    class="button primary"
                    onClick={() => void handleContinueFromDetails()}
                    disabled={checkingPreflight}
                  >
                    {checkingPreflight ? "Checking..." : "Install"}
                  </button>
                </div>
              </div>

              <button class="card-close" data-no-drag="true" onClick={() => clearSelectedPackage()} title="Close package">
                ×
              </button>

              {preflightBlockedMessage ? (
                <div class="trust-box warning">
                  <p class="trust-title">Install blocked</p>
                  <p>{preflightBlockedMessage}</p>
                </div>
              ) : null}

              <div class="package-overview">
                {packageInfo.iconDataUrl ? (
                  <img class="package-icon" src={packageInfo.iconDataUrl} alt={`${packageInfo.displayName} icon`} />
                ) : (
                  <div class="package-icon placeholder">No icon</div>
                )}
                <div>
                  <p class="subtitle package-description">{truncateDescription(packageInfo.description)}</p>
                </div>
              </div>

              {packageInfo.screenshotDataUrls.length > 0 ? (
                <div class="screenshot-strip" data-no-drag="true">
                  {packageInfo.screenshotDataUrls.map((source, index) => (
                    <button
                      key={`${packageInfo.packageUuid}-${index}`}
                      class="screenshot-tile"
                      onClick={() => openScreenshotModal(packageInfo.screenshotDataUrls, index)}
                      title={`Open screenshot ${index + 1}`}
                    >
                      <img src={source} alt={`Screenshot ${index + 1}`} />
                    </button>
                  ))}
                </div>
              ) : null}

              <section class="meta-section">
                <div class="meta-section-header">
                  <h2>App details</h2>
                </div>
                <dl class="meta-grid">
                  <MetaField
                    label="Publisher"
                    tooltip="The team or company that published this app."
                    value={packageInfo.publisher}
                  />
                  <MetaField
                    label="Version"
                    tooltip="The app version that will be installed."
                    value={packageInfo.version}
                  />
                  {packageInfo.homepageUrl ? (
                    <MetaField
                      label="Homepage"
                      tooltip="The app's official website for product information."
                      value={
                        <a class="meta-link" href={packageInfo.homepageUrl} target="_blank" rel="noreferrer">
                          {packageInfo.homepageUrl}
                        </a>
                      }
                    />
                  ) : null}
                  {packageInfo.supportUrl ? (
                    <MetaField
                      label="Support"
                      tooltip="Where to get help, report bugs, or contact maintainers."
                      value={
                        <a class="meta-link" href={packageInfo.supportUrl} target="_blank" rel="noreferrer">
                          {packageInfo.supportUrl}
                        </a>
                      }
                    />
                  ) : null}
                  {packageInfo.license ? (
                    <MetaField
                      label="License"
                      tooltip="The legal terms for using this app."
                      value={packageInfo.license}
                    />
                  ) : null}
                  <MetaField
                    label="Trust"
                    tooltip="Whether Yambuck could verify the package publisher signature."
                    value={packageInfo.trustStatus}
                  />
                </dl>
              </section>

              <section class="meta-section technical">
                <div class="meta-section-header">
                  <h2>Technical details</h2>
                  <button
                    class="meta-toggle"
                    type="button"
                    onClick={() => setShowTechnicalDetails((prev) => !prev)}
                  >
                    {showTechnicalDetails ? "Hide technical details" : "Show technical details"}
                  </button>
                </div>
                {showTechnicalDetails ? (
                  <dl class="meta-grid">
                    <MetaField
                      label="Package"
                      tooltip="The package file name selected for this install."
                      value={packageInfo.fileName}
                    />
                    <MetaField
                      label="Manifest"
                      tooltip="The manifest schema version this package was built with."
                      value={packageInfo.manifestVersion}
                    />
                    <MetaField
                      label="App ID"
                      tooltip="A stable identifier Yambuck uses for updates and app tracking."
                      value={packageInfo.appId}
                    />
                    <MetaField
                      label="Entrypoint"
                      tooltip="The internal command Yambuck uses to launch the installed app."
                      value={<code>{packageInfo.entrypoint}</code>}
                    />
                    <MetaField
                      label="App UUID"
                      tooltip="The immutable app identity UUID declared by the publisher."
                      value={packageInfo.appUuid}
                    />
                    <MetaField
                      label="Package UUID"
                      tooltip="The unique UUID assigned to this specific package build."
                      value={packageInfo.packageUuid}
                    />
                  </dl>
                ) : null}
              </section>

              {packageInfo.longDescription?.trim() ? (
                <section class="meta-section long-description">
                  <div class="meta-section-header">
                    <h2>About this app</h2>
                  </div>
                  <p>{packageInfo.longDescription}</p>
                </section>
              ) : null}
            </>
          ) : (
            <>
              <h1>Choose package</h1>
              <p class="subtitle">Open a package file to start guided installation</p>
              <div class="actions start">
                <button class="button primary" onClick={() => void choosePackage()}>
                  Open .yambuck file
                </button>
              </div>
            </>
          )}
        </section>
      );
    }

    if (!packageInfo) {
      return null;
    }

    if (step === "trust") {
      const isVerified = packageInfo.trustStatus === "verified";
      return (
        <section class="panel">
          <h1>Trust and verification</h1>
          <div class={`trust-box ${isVerified ? "verified" : "warning"}`}>
            <p class="trust-title">{isVerified ? "Verified publisher" : "Publisher not verified"}</p>
            <p>
              {isVerified
                ? "This package is signed by a trusted publisher key."
                : "Only install if you trust this source."}
            </p>
          </div>
          <div class="actions">
            <button class="button ghost" onClick={() => setStep("details")}>Back</button>
            <button class="button primary" onClick={() => setStep("scope")}>
              {isVerified ? "Next" : "Install anyway"}
            </button>
          </div>
        </section>
      );
    }

    if (step === "scope") {
      return (
        <section class="panel">
          <h1>Install scope</h1>
          <p class="subtitle">Choose who can use this application</p>
          <div class="scope-grid">
            <label class={`scope-card ${scope === "user" ? "active" : ""}`}>
              <input
                type="radio"
                name="scope"
                checked={scope === "user"}
                onChange={() => setScope("user")}
              />
              <span>Just for me</span>
              <small>Recommended. No admin prompt needed.</small>
            </label>
            <label class={`scope-card ${scope === "system" ? "active" : ""}`}>
              <input
                type="radio"
                name="scope"
                checked={scope === "system"}
                onChange={() => setScope("system")}
              />
              <span>All users</span>
              <small>May require admin permissions.</small>
            </label>
          </div>
          <div class="actions">
            <button class="button ghost" onClick={() => setStep("trust")}>Back</button>
            <button class="button primary" onClick={() => void startInstall()}>
              Install
            </button>
          </div>
        </section>
      );
    }

    if (step === "progress") {
      return (
        <section class="panel">
          <h1>Installing {packageInfo.displayName}</h1>
          <p class="subtitle">{statusText}</p>
          <div
            class="progress-shell"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div class="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p class="progress-value">{progress}%</p>
          <div class="actions">
            <button class="button ghost" disabled={isBusy}>Cancel</button>
          </div>
        </section>
      );
    }

    return (
      <section class="panel">
        <h1>Install complete</h1>
        <p class="subtitle">{packageInfo.displayName} is ready to launch.</p>
        {preview ? (
          <dl class="meta-grid compact">
            <div>
              <dt>Scope</dt>
              <dd>{preview.installScope}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>{preview.destinationPath}</dd>
            </div>
            <div>
              <dt>Trust</dt>
              <dd>{preview.trustStatus}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{preview.packageFile}</dd>
            </div>
          </dl>
        ) : null}
        <div class="actions">
          <button class="button ghost" onClick={() => setStep("details")}>Install another</button>
          <button class="button primary">Launch app</button>
        </div>
      </section>
    );
  };

  const renderInstalledApps = () => (
    <section class="panel">
      <h1>Installed apps</h1>
      <p class="subtitle">Manage applications installed by Yambuck.</p>
      <div class="actions start">
        <button class="button ghost" onClick={() => void refreshInstalledApps()}>
          Refresh list
        </button>
      </div>

      {loadingInstalled ? <p class="subtitle">Loading installed apps...</p> : null}

      {!loadingInstalled && installedApps.length === 0 ? (
        <p class="subtitle">No apps installed yet.</p>
      ) : null}

      {installedApps.length > 0 ? (
        <div class="installed-list">
          {installedApps.map((app) => (
            <article class="installed-card" key={app.appId}>
              <div>
                <h2>{app.displayName}</h2>
                <p>{app.appId}</p>
              </div>
              <div>
                <p>Version {app.version}</p>
                <p>Scope: {app.installScope}</p>
              </div>
              <div class="installed-actions">
                <button class="button ghost" onClick={() => void uninstallApp(app)}>
                  Uninstall
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );

  const renderMockPreviewPage = () => {
    const mockName = "Voquill (Mock Preview)";
    const mockVersion = "1.4.0";
    const mockManifestVersion = "1.0.0";
    const mockAppId = "com.voquill.app";
    const mockAppUuid = "6b61815c-66c5-4cc6-85ba-ec0736ecef4c";
    const mockPackageUuid = "7f2f2d3e-2662-4d8c-a4ae-05f14de8f8c6";
    const mockPublisher = "Voquill Project";
    const mockHomepage = "https://voquill.org";
    const mockSupport = "https://github.com/voquill/voquill";
    const mockLicense = "MIT";
    const mockTrust = "unverified";
    const mockDescription =
      "Mock package view for rapid UI iteration. Use this screen to tweak spacing, screenshots, metadata layout, and card actions with HMR while validating how dense package metadata reads inside a compact panel before the installer flow continues. This sentence intentionally extends well beyond normal copy length to simulate a package summary that pushes the short-description limit and demonstrates truncation behavior for at-a-glance review during install.";
    const mockLongDescription =
      "Voquill is designed for people who think faster than they type. It combines low-latency speech capture with keyboard-first editing so you can dictate rough drafts and refine them without leaving your normal workflow.\n\nIn this mock package, the long description is plain text and supports paragraph breaks. Developers can use this area for onboarding context, compatibility notes, expected hardware behavior, and any caveats that do not belong in the one-line summary.\n\nFor final packaging, keep the short summary fast to scan and reserve this section for deeper detail that helps users decide whether to trust and install the app.";
    const mockShots = [MOCK_SHOT_A, MOCK_SHOT_B, MOCK_SHOT_C, MOCK_SHOT_D, MOCK_SHOT_E, MOCK_SHOT_F];

    return (
      <section class="panel package-panel">
        <div class="details-header">
          <div>
            <h1>{mockName}</h1>
            <p class="subtitle">Mock Preview (Debug)</p>
          </div>
          <div class="details-actions" data-no-drag="true">
            <button class="button primary" onClick={() => pushToast("info", "Mock install action.")}>Install</button>
          </div>
        </div>

        <button class="card-close" data-no-drag="true" onClick={() => setPage("settings")} title="Back to debug">
          ×
        </button>

        <div class="package-overview">
          <img class="package-icon" src={MOCK_ICON} alt="Mock app icon" />
          <div>
            <p class="subtitle package-description">{truncateDescription(mockDescription)}</p>
          </div>
        </div>

        <div class="screenshot-strip" data-no-drag="true">
          {mockShots.map((source, index) => (
            <button
              key={`mock-shot-${index}`}
              class="screenshot-tile"
              onClick={() => openScreenshotModal(mockShots, index)}
              title={`Open screenshot ${index + 1}`}
            >
              <img src={source} alt={`Mock screenshot ${index + 1}`} />
            </button>
          ))}
        </div>

        <section class="meta-section">
          <div class="meta-section-header">
            <h2>App details</h2>
          </div>
          <dl class="meta-grid">
            <MetaField
              label="Publisher"
              tooltip="The team or company that published this app."
              value={mockPublisher}
            />
            <MetaField
              label="Version"
              tooltip="The app version that will be installed."
              value={mockVersion}
            />
            <MetaField
              label="Homepage"
              tooltip="The app's official website for product information."
              value={<a class="meta-link" href={mockHomepage} target="_blank" rel="noreferrer">{mockHomepage}</a>}
            />
            <MetaField
              label="Support"
              tooltip="Where to get help, report bugs, or contact maintainers."
              value={<a class="meta-link" href={mockSupport} target="_blank" rel="noreferrer">{mockSupport}</a>}
            />
            <MetaField
              label="License"
              tooltip="The legal terms for using this app."
              value={mockLicense}
            />
            <MetaField
              label="Trust"
              tooltip="Whether Yambuck could verify the package publisher signature."
              value={mockTrust}
            />
          </dl>
        </section>

        <section class="meta-section technical">
          <div class="meta-section-header">
            <h2>Technical details</h2>
            <button
              class="meta-toggle"
              type="button"
              onClick={() => setShowMockTechnicalDetails((prev) => !prev)}
            >
              {showMockTechnicalDetails ? "Hide technical details" : "Show technical details"}
            </button>
          </div>
          {showMockTechnicalDetails ? (
            <dl class="meta-grid">
              <MetaField
                label="Package"
                tooltip="The package file name selected for this install."
                value="voquill-mock.yambuck"
              />
              <MetaField
                label="Manifest"
                tooltip="The manifest schema version this package was built with."
                value={mockManifestVersion}
              />
              <MetaField
                label="App ID"
                tooltip="A stable identifier Yambuck uses for updates and app tracking."
                value={mockAppId}
              />
              <MetaField
                label="Entrypoint"
                tooltip="The internal command Yambuck uses to launch the installed app."
                value={<code>app/bin/voquill</code>}
              />
              <MetaField
                label="App UUID"
                tooltip="The immutable app identity UUID declared by the publisher."
                value={mockAppUuid}
              />
              <MetaField
                label="Package UUID"
                tooltip="The unique UUID assigned to this specific package build."
                value={mockPackageUuid}
              />
            </dl>
          ) : null}
        </section>

        <section class="meta-section long-description">
          <div class="meta-section-header">
            <h2>About this app</h2>
          </div>
          <p>{mockLongDescription}</p>
        </section>

        <div class="actions start compact" data-no-drag="true">
          <button class="button ghost" onClick={() => setPage("settings")}>Back to Debug</button>
          <button class="button ghost" onClick={() => pushToast("info", "Try editing styles with npm run dev + HMR.")}>UI hint</button>
        </div>
      </section>
    );
  };

  const renderSettingsPage = () => (
    <section class="panel">
      <h1>Settings</h1>
      <p class="subtitle">Configure Yambuck behavior and inspect diagnostics.</p>

      <div class="settings-tabs" data-no-drag="true">
        <button
          class={`toggle-pill ${settingsTab === "general" ? "active" : ""}`}
          onClick={() => setSettingsTab("general")}
        >
          General
        </button>
        <button
          class={`toggle-pill ${settingsTab === "debug" ? "active" : ""}`}
          onClick={() => setSettingsTab("debug")}
        >
          Debug
        </button>
      </div>

      {settingsTab === "general" ? (
        <div class="settings-grid">
          <article class="setting-card">
            <h2>Updates</h2>
            <p>Update checks are enabled on startup and can be run manually.</p>
            <button
              class="button ghost"
              onClick={() => void checkForUpdates(true)}
              disabled={checkingUpdates}
            >
              {checkingUpdates ? "Checking..." : "Check now"}
            </button>
          </article>
          <article class="setting-card">
            <h2>Install behavior</h2>
            <p>Default install scope is per-user. System scope requires elevation.</p>
          </article>
        </div>
      ) : (
        <div class="debug-stack">
          <section class="debug-section">
            <h2>System info</h2>
            {loadingDebug ? <p>Loading runtime data...</p> : null}
            {systemInfo ? (
              <ul class="system-info-list">
                <li>Version: <code>{systemInfo.appVersion}</code></li>
                <li>Distro: <code>{systemInfo.distro}</code></li>
                <li>Kernel: <code>{systemInfo.kernelVersion}</code></li>
                <li>Desktop: <code>{systemInfo.desktopEnvironment}</code></li>
                <li>Session: <code>{systemInfo.sessionType}</code></li>
                <li>Arch: <code>{systemInfo.arch}</code></li>
                <li>Install Path: <code>{systemInfo.installPath}</code></li>
                <li>Update Feed: <code>{systemInfo.updateFeedUrl}</code></li>
              </ul>
            ) : null}
            <div class="actions start compact">
              <button class="button ghost" onClick={() => void loadDebugData()} disabled={loadingDebug}>
                Refresh
              </button>
              <button class="button ghost" onClick={() => void copySystemInfo()}>
                Copy system info
              </button>
              <button class="button ghost" onClick={() => setPage("mockPreview")}>
                Open mock app page
              </button>
            </div>
          </section>

          <section class="debug-section">
            <h2>Logs</h2>
            <p>Timestamped events for update checks and installer actions.</p>
            <pre class="log-view">{logText || "No logs yet."}</pre>
            <div class="actions start compact">
              <button class="button ghost" onClick={() => void copyLogs()}>
                Copy logs
              </button>
              <button class="button ghost" onClick={() => void handleClearLogs()}>
                Clear logs
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
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
        <div class="topbar-right" data-no-drag="true">
          <button
            class={`window-btn icon ${page === "settings" ? "active" : ""}`}
            onClick={() => {
              setPage("settings");
              setSettingsTab("general");
            }}
            title="Settings"
          >
            <IconSettings size={14} />
          </button>
          <div class="window-controls" data-no-drag="true">
            <button class="window-btn" onClick={() => void handleMinimize()} title="Minimize">
              -
            </button>
            <button
              class="window-btn"
              onClick={() => void handleToggleMaximize()}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? "▢" : "□"}
            </button>
            <button class="window-btn close" onClick={() => void handleClose()} title="Close">
              ×
            </button>
          </div>
        </div>
      </header>

      <div class="toast-host" data-no-drag="true">
        {toasts.map((toast) => (
          <div key={toast.id} class={`toast ${toast.tone}`}>
            <span>{toast.message}</span>
            <button class="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss toast">
              ×
            </button>
          </div>
        ))}
      </div>

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
