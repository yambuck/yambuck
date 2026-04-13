import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useMemo, useState } from "preact/hooks";
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

  const stepIndex = useMemo(() => {
    const order: WizardStep[] = ["details", "trust", "scope", "progress", "complete"];
    return order.indexOf(step) + 1;
  }, [step]);

  const choosePackage = async () => {
    setMessage("");
    const selected = await open({
      multiple: false,
      filters: [{ name: "Yambuck package", extensions: ["yambuck"] }],
    });

    if (!selected || Array.isArray(selected)) {
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
      <header class="topbar">
        <div>
          <p class="kicker">Yambuck Installer</p>
          <p class="headline">
            {mode === "install" ? `Step ${stepIndex} of 5` : "Installed apps"}
          </p>
        </div>
        <div class="topbar-controls">
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
          <div class="runtime-pill">
            {context
              ? `${context.productName} ${context.appVersion} on ${context.platform}`
              : "Loading runtime"}
          </div>
        </div>
      </header>

      {message ? <div class={`notice-banner ${messageTone}`}>{message}</div> : null}

      {mode === "install" ? renderInstallStep() : renderInstalledApps()}
    </main>
  );
}

export default App;
