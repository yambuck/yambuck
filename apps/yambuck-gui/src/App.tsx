import { IconBrandGithub } from "@tabler/icons-preact";
import { useEffect, useState } from "preact/hooks";
import { ToastHost } from "./components/ui/ToastHost";
import { WindowControls } from "./components/ui/WindowControls";
import { Panel } from "./components/ui/Panel";
import { InstalledAppReviewPage } from "./features/installed/InstalledAppReviewPage";
import { InstalledAppsPage } from "./features/installed/InstalledAppsPage";
import { InstallerPage } from "./features/installer/InstallerPage";
import { MockInstallFlowPage } from "./features/mock-preview/MockInstallFlowPage";
import { MockInstalledAppsPage } from "./features/mock-preview/MockInstalledAppsPage";
import { MockPreviewPage } from "./features/mock-preview/MockPreviewPage";
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
import { mockInstalledApps, toMockInstalledAppDetails } from "./mocks/mockData";
import type {
  AppPage,
  InstalledApp,
  InstallerContext,
  SettingsTab,
} from "./types/app";
import { useEscapeKey } from "./useEscapeKey";
import "./App.css";

type RouteState = {
  page: AppPage;
  settingsTab: SettingsTab;
  installedReviewAppId: string | null;
  mockInstalledReviewAppId: string | null;
};

const routeFromHash = (hash: string): RouteState => {
  const segments = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] === "installer") {
    return { page: "installer", settingsTab: "general", installedReviewAppId: null, mockInstalledReviewAppId: null };
  }

  if (segments[0] === "installed") {
    if (segments[1] === "review" && segments[2]) {
      return {
        page: "installedReview",
        settingsTab: "general",
        installedReviewAppId: decodeURIComponent(segments.slice(2).join("/")),
        mockInstalledReviewAppId: null,
      };
    }
    return { page: "installed", settingsTab: "general", installedReviewAppId: null, mockInstalledReviewAppId: null };
  }

  if (segments[0] === "settings") {
    return {
      page: "settings",
      settingsTab: segments[1] === "debug" ? "debug" : "general",
      installedReviewAppId: null,
      mockInstalledReviewAppId: null,
    };
  }

  if (segments[0] === "mock") {
    if (segments[1] === "installed") {
      if (segments[2] === "review" && segments[3]) {
        return {
          page: "mockInstalledReview",
          settingsTab: "general",
          installedReviewAppId: null,
          mockInstalledReviewAppId: decodeURIComponent(segments.slice(3).join("/")),
        };
      }
      return { page: "mockInstalled", settingsTab: "general", installedReviewAppId: null, mockInstalledReviewAppId: null };
    }
    if (segments[1] === "install-flow") {
      return { page: "mockInstallFlow", settingsTab: "general", installedReviewAppId: null, mockInstalledReviewAppId: null };
    }
    return { page: "mockPreview", settingsTab: "general", installedReviewAppId: null, mockInstalledReviewAppId: null };
  }

  return { page: "installer", settingsTab: "general", installedReviewAppId: null, mockInstalledReviewAppId: null };
};

const hashFromRoute = ({ page, settingsTab, installedReviewAppId, mockInstalledReviewAppId }: RouteState): string => {
  if (page === "installer") {
    return "#/installer";
  }
  if (page === "installed") {
    return "#/installed";
  }
  if (page === "installedReview") {
    return installedReviewAppId ? `#/installed/review/${encodeURIComponent(installedReviewAppId)}` : "#/installed";
  }
  if (page === "settings") {
    return settingsTab === "debug" ? "#/settings/debug" : "#/settings";
  }
  if (page === "mockInstalled") {
    return "#/mock/installed";
  }
  if (page === "mockInstalledReview") {
    return mockInstalledReviewAppId
      ? `#/mock/installed/review/${encodeURIComponent(mockInstalledReviewAppId)}`
      : "#/mock/installed";
  }
  if (page === "mockInstallFlow") {
    return "#/mock/install-flow";
  }
  return "#/mock/preview";
};

function App() {
  const [page, setPage] = useState<AppPage>(() => routeFromHash(window.location.hash).page);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(() => routeFromHash(window.location.hash).settingsTab);
  const [installedReviewAppId, setInstalledReviewAppId] = useState<string | null>(() => routeFromHash(window.location.hash).installedReviewAppId);
  const [showInstalledReviewTechnicalDetails, setShowInstalledReviewTechnicalDetails] = useState(false);
  const [mockInstalledReviewAppId, setMockInstalledReviewAppId] = useState<string | null>(() => routeFromHash(window.location.hash).mockInstalledReviewAppId);
  const [showMockInstalledReviewTechnicalDetails, setShowMockInstalledReviewTechnicalDetails] = useState(false);
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
    loadingInstalledAppDetails,
    refreshInstalledApps,
    installedAppDetails,
    openInstalledAppDetailsByAppId,
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
    const applyRouteFromHash = () => {
      const route = routeFromHash(window.location.hash);
      setPage(route.page);
      setSettingsTab(route.settingsTab);
      setInstalledReviewAppId(route.installedReviewAppId);
      setMockInstalledReviewAppId(route.mockInstalledReviewAppId);
      if (route.page !== "installedReview") {
        closeInstalledAppDetails();
        setShowInstalledReviewTechnicalDetails(false);
      }
      if (route.page !== "mockInstalledReview") {
        setShowMockInstalledReviewTechnicalDetails(false);
      }
    };

    applyRouteFromHash();
    window.addEventListener("hashchange", applyRouteFromHash);
    return () => {
      window.removeEventListener("hashchange", applyRouteFromHash);
    };
  }, []);

  useEffect(() => {
    const nextHash = hashFromRoute({ page, settingsTab, installedReviewAppId, mockInstalledReviewAppId });
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [page, settingsTab, installedReviewAppId, mockInstalledReviewAppId]);

  useEffect(() => {
    if (page !== "installedReview" || !installedReviewAppId) {
      return;
    }
    if (installedAppDetails?.appId === installedReviewAppId) {
      return;
    }

    void openInstalledAppDetailsByAppId(installedReviewAppId, installedReviewAppId).then((details) => {
      if (!details) {
        setInstalledReviewAppId(null);
        setPage("installed");
      }
    });
  }, [page, installedReviewAppId, installedAppDetails?.appId]);

  useEffect(() => {
    if (page === "installed" || page === "installedReview") {
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

  const handleMetaFieldCopied = (label: string) => {
    pushToast("success", `${label} copied to clipboard.`);
  };

  const navigateToInstalledList = () => {
    setInstalledReviewAppId(null);
    setMockInstalledReviewAppId(null);
    closeInstalledAppDetails();
    setShowInstalledReviewTechnicalDetails(false);
    setPage("installed");
  };

  const openInstalledReview = async (app: { appId: string; displayName: string }) => {
    setInstalledReviewAppId(app.appId);
    setShowInstalledReviewTechnicalDetails(false);
    setPage("installedReview");
    const details = await openInstalledAppDetailsByAppId(app.appId, app.displayName);
    if (!details) {
      setInstalledReviewAppId(null);
      setPage("installed");
    }
  };

  const navigateToMockInstalledList = () => {
    setMockInstalledReviewAppId(null);
    setShowMockInstalledReviewTechnicalDetails(false);
    setPage("mockInstalled");
  };

  const openMockInstalledReview = (app: InstalledApp) => {
    setMockInstalledReviewAppId(app.appId);
    setShowMockInstalledReviewTechnicalDetails(false);
    setPage("mockInstalledReview");
  };

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
        onMetaFieldCopied={handleMetaFieldCopied}
      />
    );
  };

  const renderInstalledApps = () => (
    <InstalledAppsPage
      loadingInstalled={loadingInstalled}
      installedApps={installedApps}
      onRefresh={() => void refreshInstalledApps()}
      onOpenDetails={(app) => void openInstalledReview(app)}
    />
  );

  const renderInstalledReviewPage = () => {
    if (!installedAppDetails || (installedReviewAppId && installedAppDetails.appId !== installedReviewAppId)) {
      return (
        <Panel>
          <h1>Loading app review...</h1>
          <p>{loadingInstalledAppDetails ? "Fetching archived package details." : "Unable to load app review."}</p>
        </Panel>
      );
    }

    const app = {
      appId: installedAppDetails.appId,
      displayName: installedAppDetails.displayName,
      version: installedAppDetails.version,
      installStatus: "installed" as const,
      installScope: installedAppDetails.installScope,
      installedAt: installedAppDetails.installedAt,
      destinationPath: installedAppDetails.destinationPath,
      iconDataUrl: installedAppDetails.packageInfo.iconDataUrl,
    };

    return (
      <InstalledAppReviewPage
        details={installedAppDetails}
        showTechnicalDetails={showInstalledReviewTechnicalDetails}
        onToggleTechnicalDetails={() => setShowInstalledReviewTechnicalDetails((prev) => !prev)}
        onBack={navigateToInstalledList}
        onOpenScreenshot={openScreenshotModal}
        onOpenLicense={openLicenseViewer}
        onMetaFieldCopied={handleMetaFieldCopied}
        onLaunch={() => {
          void launchInstalledApp(app);
        }}
        onUninstall={() => {
          navigateToInstalledList();
          openUninstallWizard(app);
        }}
      />
    );
  };

  const renderMockPreviewPage = () => {
    return (
      <MockPreviewPage
        showMockTechnicalDetails={showMockTechnicalDetails}
        onToggleTechnicalDetails={() => setShowMockTechnicalDetails((prev) => !prev)}
        onOpenScreenshot={(gallery, index) => openScreenshotModal(gallery, index)}
        onOpenLicense={(title, text) => openLicenseViewer(title, text)}
        onBackToSettings={() => {
          setSettingsTab("debug");
          setPage("settings");
        }}
        onStartInstallFlow={() => setPage("mockInstallFlow")}
        onMetaFieldCopied={handleMetaFieldCopied}
      />
    );
  };

  const renderMockInstalledAppsPage = () => (
    <MockInstalledAppsPage
      onToast={pushToast}
      onOpenDetails={openMockInstalledReview}
    />
  );

  const renderMockInstalledReviewPage = () => {
    const target = mockInstalledReviewAppId
      ? mockInstalledApps.find((candidate) => candidate.appId === mockInstalledReviewAppId)
      : null;
    if (!target) {
      return (
        <Panel>
          <h1>Unable to load mock app review.</h1>
          <p>Return to the mock installed list and choose an app.</p>
        </Panel>
      );
    }

    const details = toMockInstalledAppDetails(target);

    return (
      <InstalledAppReviewPage
        details={details}
        showTechnicalDetails={showMockInstalledReviewTechnicalDetails}
        onToggleTechnicalDetails={() => setShowMockInstalledReviewTechnicalDetails((prev) => !prev)}
        onBack={navigateToMockInstalledList}
        onOpenScreenshot={openScreenshotModal}
        onOpenLicense={openLicenseViewer}
        onMetaFieldCopied={handleMetaFieldCopied}
        onLaunch={() => pushToast("success", `Mock launch: ${details.displayName}`)}
        onUninstall={() => pushToast("warning", `Mock uninstall prompt: ${details.displayName}`)}
      />
    );
  };

  const renderMockInstallFlowPage = () => (
    <MockInstallFlowPage
      onOpenScreenshot={(gallery, index) => openScreenshotModal(gallery, index)}
      onOpenLicense={(title, text) => openLicenseViewer(title, text)}
      onToast={pushToast}
      onBackToPreview={() => setPage("mockPreview")}
      onViewInstalledDetails={(appId) => {
        setMockInstalledReviewAppId(appId);
        setShowMockInstalledReviewTechnicalDetails(false);
        setPage("mockInstalledReview");
      }}
      onExitToDebug={() => {
        setSettingsTab("debug");
        setPage("settings");
      }}
    />
  );

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
      onOpenMockInstalledApps={() => {
        setMockInstalledReviewAppId(null);
        setPage("mockInstalled");
      }}
      onCopyLogs={() => void copyLogs()}
      onClearLogs={() => void clearLogs()}
    />
  );

  const renderCurrentPage = () => {
    if (page === "installer") {
      return renderInstallStep();
    }
    if (page === "installed") {
      return renderInstalledApps();
    }
    if (page === "installedReview") {
      return renderInstalledReviewPage();
    }
    if (page === "settings") {
      return renderSettingsPage();
    }
    if (page === "mockInstalled") {
      return renderMockInstalledAppsPage();
    }
    if (page === "mockInstalledReview") {
      return renderMockInstalledReviewPage();
    }
    if (page === "mockInstallFlow") {
      return renderMockInstallFlowPage();
    }
    return renderMockPreviewPage();
  };

  return (
    <main class="app-shell">
      <header class="topbar" onMouseDown={(event) => void handleTitlebarMouseDown(event)}>
        <div class="topbar-left" data-no-drag="true">
          <button
            class={`toggle-pill ${page === "installer" ? "active" : ""}`}
            onClick={() => {
              closeInstalledAppDetails();
              setInstalledReviewAppId(null);
              setMockInstalledReviewAppId(null);
              setPage("installer");
            }}
          >
            Installer
          </button>
          <button
            class={`toggle-pill ${page === "installed" || page === "installedReview" ? "active" : ""}`}
            onClick={navigateToInstalledList}
          >
            Installed Apps
          </button>
        </div>
        <WindowControls
          settingsActive={page === "settings"}
          isMaximized={isMaximized}
          onOpenSettings={() => {
            closeInstalledAppDetails();
            setInstalledReviewAppId(null);
            setMockInstalledReviewAppId(null);
            setPage("settings");
            setSettingsTab("general");
          }}
          onMinimize={() => void handleMinimize()}
          onToggleMaximize={() => void handleToggleMaximize()}
          onClose={() => void handleClose()}
        />
      </header>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />

      <div class="workspace-stage" data-no-drag="true">
        <section class="content-scroll">
          {renderCurrentPage()}
        </section>

        <footer class="app-footer">
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
      </div>
    </main>
  );
}

export default App;
