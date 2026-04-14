import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconBrandGithub } from "@tabler/icons-preact";
import { useEffect, useState } from "preact/hooks";
import "./App.css";

type WizardStep = "details" | "trust" | "scope" | "progress" | "complete";
type InstallScope = "user" | "system";
type ScreenMode = "install" | "installed";
type MessageTone = "info" | "error";

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
  publisher: string;
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

function App() {
  const [mode, setMode] = useState<ScreenMode>("install");
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
  const [message, setMessage] = useState<string>("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(null);
  const [applyingUpdate, setApplyingUpdate] = useState(false);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const value = await invoke<InstallerContext>("get_installer_context");
        setContext(value);
        setScope(value.defaultScope);
      } catch {
        setMessageTone("error");
        setMessage("Unable to load installer runtime context.");
      }
    };

    void loadContext();
  }, []);

  useEffect(() => {
    if (mode === "installed") {
      void refreshInstalledApps();
    }
  }, [mode]);

  useEffect(() => {
    void checkForUpdates(false);
  }, []);

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
    setMessage("");
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
      setMessageTone("error");
      setMessage("Unable to open file picker. Check app permissions and try again.");
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
      setMessageTone("info");
      setMessage(`Loaded package ${inspected.fileName}`);
    } catch {
      setMessageTone("error");
      setMessage("Unable to open package. Choose a valid .yambuck file.");
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

      if (!result.updateAvailable && showNoUpdateMessage) {
        setMessageTone("info");
        setMessage(`You're up to date (v${result.currentVersion}).`);
      }
    } catch {
      setMessageTone("error");
      setMessage("Unable to check for updates right now.");
    } finally {
      setCheckingUpdates(false);
    }
  };

  const refreshInstalledApps = async () => {
    setLoadingInstalled(true);
    try {
      const apps = await invoke<InstalledApp[]>("list_installed_apps");
      setInstalledApps(apps);
    } catch {
      setMessageTone("error");
      setMessage("Unable to load installed apps list.");
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
      setMessageTone("info");
      setMessage(`${app.displayName} removed.`);
      await refreshInstalledApps();
    } catch {
      setMessageTone("error");
      setMessage(`Failed to uninstall ${app.displayName}.`);
    }
  };

  const startInstall = async () => {
    if (!packageInfo) {
      setMessageTone("error");
      setMessage("Choose a .yambuck package before installing.");
      return;
    }

    const selectedPackage = packageInfo;

    setMessage("");
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
      setMessageTone("error");
      setMessage("Failed to generate install preview.");
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
      setMessageTone("info");
      setMessage(`${selectedPackage.displayName} installed.`);
      await refreshInstalledApps();
    } catch {
      setMessageTone("error");
      setMessage("Install finished with issues. Could not update installed apps index.");
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
      setMessageTone("error");
      setMessage("Unable to minimize window.");
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
      setMessageTone("error");
      setMessage("Unable to resize window.");
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch {
      setMessageTone("error");
      setMessage("Unable to close window.");
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
      setMessageTone("error");
      setMessage("Update metadata is incomplete. Please try again later.");
      return;
    }

    setApplyingUpdate(true);
    setMessageTone("info");
    setMessage(`Applying update ${updateResult.latestVersion}. Yambuck will restart.`);

    try {
      await invoke("apply_update_and_restart", {
        downloadUrl: updateResult.downloadUrl,
        expectedSha256: updateResult.sha256,
      });
      await getCurrentWindow().close();
    } catch {
      setMessageTone("error");
      setMessage("Unable to apply update automatically. Please retry or use website installer.");
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
                  <dt>App UUID</dt>
                  <dd>{packageInfo.appUuid}</dd>
                </div>
                <div>
                  <dt>Package UUID</dt>
                  <dd>{packageInfo.packageUuid}</dd>
                </div>
              </dl>
              <div class="actions">
                <button class="button primary" onClick={() => setStep("trust")}>Continue</button>
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

  return (
    <main class="app-shell">
      <header class="topbar" onMouseDown={(event) => void handleTitlebarMouseDown(event)}>
        <div class="topbar-left" data-no-drag="true">
          <button
            class={`toggle-pill ${mode === "install" ? "active" : ""}`}
            onClick={() => setMode("install")}
          >
            Installer
          </button>
          <button
            class={`toggle-pill ${mode === "installed" ? "active" : ""}`}
            onClick={() => setMode("installed")}
          >
            Installed Apps
          </button>
        </div>
        <div class="topbar-title">Yambuck Installer</div>
        <div class="topbar-right" data-no-drag="true">
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

      {message ? <div class={`notice-banner ${messageTone}`}>{message}</div> : null}

      {showUpdateBanner ? (
        <section class="update-banner" data-no-drag="true">
          <div>
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
        </section>
      ) : null}

      {mode === "install" ? renderInstallStep() : renderInstalledApps()}

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
