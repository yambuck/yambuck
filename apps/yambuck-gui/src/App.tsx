import { IconBrandGithub } from "@tabler/icons-preact";
import { useEffect, useState } from "preact/hooks";
import { ToastHost } from "./components/ui/ToastHost";
import { WindowControls } from "./components/ui/WindowControls";
import { InstalledAppsPage } from "./features/installed/InstalledAppsPage";
import { InstallerPage } from "./features/installer/InstallerPage";
import { MockPreviewPage } from "./features/mock-preview/MockPreviewPage";
import { InstalledAppReviewModal } from "./features/modals/InstalledAppReviewModal";
import { LicenseViewerModal } from "./features/modals/LicenseViewerModal";
import { ScreenshotModal } from "./features/modals/ScreenshotModal";
import { UninstallWizardModal } from "./features/modals/UninstallWizardModal";
import { UpdateModal } from "./features/modals/UpdateModal";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useDebugTools } from "./hooks/useDebugTools";
import { useInstalledAppsManager } from "./hooks/useInstalledAppsManager";
import { useInstallerFlow } from "./hooks/useInstallerFlow";
import { useToastManager } from "./hooks/useToastManager";
import { useUpdateManager } from "./hooks/useUpdateManager";
import { useWindowControls } from "./hooks/useWindowControls";
import { getInstallerContext } from "./lib/tauri/api";
import type {
  AppPage,
  InstallerContext,
  SettingsTab,
} from "./types/app";
import { useEscapeKey } from "./useEscapeKey";
import "./App.css";

function App() {
  const [page, setPage] = useState<AppPage>("installer");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [context, setContext] = useState<InstallerContext | null>(null);
  const [showMockTechnicalDetails, setShowMockTechnicalDetails] = useState(false);

  const { toasts, pushToast, dismissToast } = useToastManager();
  const {
    updateResult,
    checkingUpdates,
    isUpdateModalOpen,
    applyingUpdate,
    hasUpdateAvailable,
    checkForUpdates,
    closeUpdateModal,
    openUpdateModal,
    relativeLastChecked,
    handleUpdateAndRestart,
  } = useUpdateManager({
    onErrorToast: (message) => pushToast("error", message),
    onInfoToast: (message) => pushToast("info", message),
  });
  const {
    installedApps,
    loadingInstalled,
    refreshInstalledApps,
    installedAppDetails,
    openInstalledAppDetails,
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
  } = useInstalledAppsManager({
    onToast: pushToast,
  });
  const {
    systemInfo,
    logText,
    loadingDebug,
    loadDebugData,
    copySystemInfo,
    copyLogs,
    clearLogs,
  } = useDebugTools({
    onToast: pushToast,
  });
  const {
    step,
    setStep,
    scope,
    setScope,
    progress,
    statusText,
    installLifecycleState,
    packageInfo,
    installOptions,
    managedExistingInstall,
    installDecision,
    wipeOnReinstall,
    confirmWipeOnReinstall,
    allowDowngrade,
    setReinstallWipeChoice,
    setConfirmWipeOnReinstall,
    setDowngradeAllowed,
    installOptionValues,
    installOptionError,
    validatingInstallOptions,
    setInstallOptionValue,
    packageOpenError,
    copyPackageOpenErrorDetails,
    installFailure,
    copyInstallFailureDetails,
    openInstallLogsDirectory,
    preview,
    isBusy,
    preflightBlockedMessage,
    checkingPreflight,
    showTechnicalDetails,
    setShowTechnicalDetails,
    showCompleteTechnicalDetails,
    setShowCompleteTechnicalDetails,
    licenseAccepted,
    setLicenseAccepted,
    licenseViewer,
    openLicenseViewer,
    closeLicenseViewer,
    choosePackage,
    clearSelectedPackage,
    closeInstallComplete,
    openScreenshotModal,
    handleContinueFromDetails,
    continueFromTrustStep,
    continueFromLicenseStep,
    continueFromOptionsStep,
    goBackFromTrustStep,
    goBackFromLicenseStep,
    goBackFromOptionsStep,
    goBackFromScopeStep,
    startInstall,
    launchCurrentPackage,
    activeScreenshotIndex,
    screenshotGallery,
    closeScreenshotModal,
    cycleScreenshot,
  } = useInstallerFlow({
    setPage,
    onRefreshInstalledApps: refreshInstalledApps,
    onLaunchInstalledApp: launchInstalledApp,
    onToast: pushToast,
  });
  const {
    isMaximized,
    handleTitlebarMouseDown,
    handleMinimize,
    handleToggleMaximize,
    handleClose,
  } = useWindowControls({ onError: (message) => pushToast("error", message) });

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

  useEscapeKey(page === "installer" && step === "complete" && packageInfo !== null, closeInstallComplete);

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
        installLifecycleState={installLifecycleState}
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
        onGoBackFromTrustStep={goBackFromTrustStep}
        onContinueFromTrustStep={continueFromTrustStep}
        onGoBackFromLicenseStep={goBackFromLicenseStep}
        onContinueFromLicenseStep={continueFromLicenseStep}
        onGoBackFromOptionsStep={goBackFromOptionsStep}
        onContinueFromOptionsStep={() => void continueFromOptionsStep()}
        onGoBackFromScopeStep={goBackFromScopeStep}
        installOptions={installOptions}
        managedExistingInstall={managedExistingInstall}
        installDecision={installDecision}
        wipeOnReinstall={wipeOnReinstall}
        confirmWipeOnReinstall={confirmWipeOnReinstall}
        allowDowngrade={allowDowngrade}
        onSetReinstallWipeChoice={setReinstallWipeChoice}
        onSetConfirmWipeOnReinstall={setConfirmWipeOnReinstall}
        onSetDowngradeAllowed={setDowngradeAllowed}
        installOptionValues={installOptionValues}
        installOptionError={installOptionError}
        validatingInstallOptions={validatingInstallOptions}
        onSetInstallOptionValue={setInstallOptionValue}
        packageOpenError={packageOpenError}
        onCopyPackageOpenErrorDetails={() => void copyPackageOpenErrorDetails()}
        installFailure={installFailure}
        onCopyInstallFailureDetails={() => void copyInstallFailureDetails()}
        onOpenInstallLogsDirectory={() => void openInstallLogsDirectory()}
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
      onClearLogs={() => void clearLogs()}
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
        <UpdateModal
          updateResult={updateResult}
          applyingUpdate={applyingUpdate}
          lastCheckedLabel={relativeLastChecked()}
          onClose={closeUpdateModal}
          onUpdateAndRestart={() => void handleUpdateAndRestart()}
        />
      ) : null}

      {licenseViewer ? (
        <LicenseViewerModal title={licenseViewer.title} text={licenseViewer.text} onClose={closeLicenseViewer} />
      ) : null}

      {installedAppDetails ? (
        <InstalledAppReviewModal
          details={installedAppDetails}
          onClose={closeInstalledAppDetails}
          onOpenScreenshot={openScreenshotModal}
          onOpenLicense={openLicenseViewer}
        />
      ) : null}

      {uninstallTarget ? (
        <UninstallWizardModal
          uninstallTarget={uninstallTarget}
          uninstallStep={uninstallStep}
          uninstallRemoveUserData={uninstallRemoveUserData}
          loadingUninstallDetails={loadingUninstallDetails}
          uninstallDetails={uninstallDetails}
          uninstallResult={uninstallResult}
          uninstallError={uninstallError}
          onClose={closeUninstallWizard}
          onSetStep={setUninstallStep}
          onSetRemoveUserData={setUninstallRemoveUserData}
          onRunUninstall={() => void runUninstall()}
        />
      ) : null}

      {activeScreenshotIndex !== null && screenshotGallery.length > 0 ? (
        <ScreenshotModal
          activeIndex={activeScreenshotIndex}
          gallery={screenshotGallery}
          onClose={closeScreenshotModal}
          onPrevious={() => cycleScreenshot(-1)}
          onNext={() => cycleScreenshot(1)}
        />
      ) : null}

      <footer class="app-footer" data-no-drag="true">
        <div class="footer-meta">
          <span class="footer-version">
            {context ? `Yambuck v${context.appVersion}` : "Yambuck"}
          </span>
          {hasUpdateAvailable ? (
            <button class="footer-action update" onClick={openUpdateModal}>
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
