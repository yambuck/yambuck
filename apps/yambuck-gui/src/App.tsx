import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconBrandGithub, IconSettings } from "@tabler/icons-preact";
import { useEffect, useState } from "preact/hooks";
import "./App.css";

type WizardStep = "details" | "trust" | "scope" | "progress" | "complete";
type InstallScope = "user" | "system";
type AppPage = "installer" | "installed" | "settings";
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
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(null);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [logText, setLogText] = useState("");
  const [loadingDebug, setLoadingDebug] = useState(false);
  const [preflightBlockedMessage, setPreflightBlockedMessage] = useState("");
  const [checkingPreflight, setCheckingPreflight] = useState(false);

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

    try {
      const inspected = await invoke<PackageInfo>("inspect_package", {
        packageFile: selected,
      });
      setPackageInfo(inspected);
      setStep("details");
      setPreview(null);
      setPreflightBlockedMessage("");
      pushToast("success", `Loaded package ${inspected.fileName}`);
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

      if (result.updateAvailable && showNoUpdateMessage) {
        pushToast("info", `Update available: v${result.currentVersion} -> v${result.latestVersion}`);
      }

      if (!result.updateAvailable && showNoUpdateMessage) {
        pushToast("info", `You're up to date (v${result.currentVersion}).`);
      }
    } catch {
      pushToast("error", "Unable to check for updates right now.");
    } finally {
      setCheckingUpdates(false);
    }
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

  const dismissUpdateNotice = () => {
    if (!updateResult) {
      return;
    }
    setDismissedUpdateVersion(updateResult.latestVersion);
  };

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

  const showUpdateBanner =
    updateResult?.updateAvailable && updateResult.latestVersion !== dismissedUpdateVersion;

  const renderInstallStep = () => {
    if (step === "details") {
      return (
        <section class="panel">
          <h1>{packageInfo ? packageInfo.displayName : "Choose package"}</h1>
          <p class="subtitle">Open a package file to start guided installation</p>
          <div class="actions start">
            <button class="button primary" onClick={() => void choosePackage()}>
              Open .yambuck file
            </button>
          </div>

          {packageInfo ? (
            <>
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
                  <p class="subtitle package-description">{packageInfo.description}</p>
                  <p class="subtitle">Entrypoint: <code>{packageInfo.entrypoint}</code></p>
                </div>
              </div>

              {packageInfo.screenshotDataUrls.length > 0 ? (
                <div class="screenshot-strip" data-no-drag="true">
                  {packageInfo.screenshotDataUrls.map((source, index) => (
                    <img key={`${packageInfo.packageUuid}-${index}`} src={source} alt={`Screenshot ${index + 1}`} />
                  ))}
                </div>
              ) : null}

              <dl class="meta-grid">
                <div>
                  <dt>Package</dt>
                  <dd>{packageInfo.fileName}</dd>
                </div>
                <div>
                  <dt>Publisher</dt>
                  <dd>{packageInfo.publisher}</dd>
                </div>
                <div>
                  <dt>App ID</dt>
                  <dd>{packageInfo.appId}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{packageInfo.version}</dd>
                </div>
                <div>
                  <dt>Manifest</dt>
                  <dd>{packageInfo.manifestVersion}</dd>
                </div>
                <div>
                  <dt>App UUID</dt>
                  <dd>{packageInfo.appUuid}</dd>
                </div>
                <div>
                  <dt>Package UUID</dt>
                  <dd>{packageInfo.packageUuid}</dd>
                </div>
                {packageInfo.homepageUrl ? (
                  <div>
                    <dt>Homepage</dt>
                    <dd>{packageInfo.homepageUrl}</dd>
                  </div>
                ) : null}
              </dl>
              <div class="actions">
                <button
                  class="button primary"
                  onClick={() => void handleContinueFromDetails()}
                  disabled={checkingPreflight}
                >
                  {checkingPreflight ? "Checking..." : "Continue"}
                </button>
              </div>
            </>
          ) : null}
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
          {page === "installer" ? "Yambuck Installer" : page === "installed" ? "Installed Apps" : "Settings"}
        </div>
        <div class="topbar-right" data-no-drag="true">
          <button
            class="window-btn icon"
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
        {showUpdateBanner && updateResult ? (
          <div class="toast action info">
            <div class="toast-body">
              <p class="update-title">Update available</p>
              <p class="update-subtitle">
                {`v${updateResult.currentVersion} -> v${updateResult.latestVersion}`}
              </p>
            </div>
            <div class="update-actions">
              {updateResult.notesUrl ? (
                <a
                  class="button ghost"
                  href={updateResult.notesUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Release notes
                </a>
              ) : null}
              <button class="button ghost" onClick={() => dismissUpdateNotice()}>
                Later
              </button>
              <button
                class="button primary"
                onClick={() => void handleUpdateAndRestart()}
                disabled={applyingUpdate}
              >
                {applyingUpdate ? "Applying..." : "Update and restart"}
              </button>
            </div>
          </div>
        ) : null}
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
            : renderSettingsPage()}
      </section>

      <footer class="app-footer" data-no-drag="true">
        <div class="footer-meta">
          <span class="footer-version">
            {context ? `Yambuck v${context.appVersion}` : "Yambuck"}
          </span>
          <button
            class="footer-action"
            onClick={() => void checkForUpdates(true)}
            disabled={checkingUpdates}
          >
            {checkingUpdates ? "Checking..." : "Check for updates"}
          </button>
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
