import { IconBrandGithub } from "@tabler/icons-preact";
import { useEffect, useState } from "preact/hooks";
import { ToastHost } from "./components/ui/ToastHost";
import { Panel } from "./components/ui/Panel";
import { PanelHeader } from "./components/ui/PanelHeader";
import { InstalledAppReviewPage } from "./features/installed/InstalledAppReviewPage";
import { InstalledAppsPage } from "./features/installed/InstalledAppsPage";
import { UninstallFlowPage } from "./features/installed/UninstallFlowPage";
import { InstallerPage } from "./features/installer/InstallerPage";
import { PackageBuilderPage } from "./features/package-builder/PackageBuilderPage";
import { DebugControlToolbar, type DebugInstallScenario } from "./features/mock-preview/DebugControlToolbar";
import { MockInstallFlowPage } from "./features/mock-preview/MockInstallFlowPage";
import { MockInstalledAppsPage } from "./features/mock-preview/MockInstalledAppsPage";
import { MockPreviewPage } from "./features/mock-preview/MockPreviewPage";
import { MockUninstallFlowPage } from "./features/mock-preview/MockUninstallFlowPage";
import { UiDebugLabPage } from "./features/mock-preview/UiDebugLabPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { useBuilderGate } from "./hooks/useBuilderGate";
import { AppTopBar } from "./layout/AppTopBar";
import { AppPageRenderer } from "./layout/AppPageRenderer";
import { AppModalHost } from "./layout/AppModalHost";
import { useDebugTools } from "./hooks/useDebugTools";
import { useInstalledAppsManager } from "./hooks/useInstalledAppsManager";
import { useInstallerFlow } from "./hooks/useInstallerFlow";
import { useToastManager } from "./hooks/useToastManager";
import { useUpdateManager } from "./hooks/useUpdateManager";
import { useWindowControls } from "./hooks/useWindowControls";
import { getInstallerContext } from "./lib/tauri/api";
import { logUiAction } from "./lib/ui-log";
import { mockInstalledApps, mockPackageInfo, toMockInstalledAppDetails } from "./mocks/mockData";
import { copyPlainText } from "./utils/clipboard";
import { appText } from "./i18n/app";
import type {
  AppPage,
  InstalledApp,
  InstallerContext,
  SettingsTab,
} from "./types/app";
import { hashFromRoute, makeInstalledReviewTarget, parseInstalledReviewTarget, routeFromHash } from "./routes/appRoutes";
import { useEscapeKey } from "./useEscapeKey";
import "./App.css";

const getInteractionLabel = (element: HTMLElement): string => {
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) {
    return ariaLabel;
  }

  const title = element.getAttribute("title")?.trim();
  if (title) {
    return title;
  }

  const text = element.textContent?.replace(/\s+/g, " ").trim();
  if (text) {
    return text.slice(0, 120);
  }

  return element.tagName.toLowerCase();
};


function App() {
  const [page, setPage] = useState<AppPage>(() => routeFromHash(window.location.hash).page);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>(() => routeFromHash(window.location.hash).settingsTab);
  const [installedReviewTarget, setInstalledReviewTarget] = useState<string | null>(() => routeFromHash(window.location.hash).installedReviewTarget);
  const [showInstalledReviewTechnicalDetails, setShowInstalledReviewTechnicalDetails] = useState(false);
  const [mockInstalledReviewAppId, setMockInstalledReviewAppId] = useState<string | null>(() => routeFromHash(window.location.hash).mockInstalledReviewAppId);
  const [showMockInstalledReviewTechnicalDetails, setShowMockInstalledReviewTechnicalDetails] = useState(false);
  const [context, setContext] = useState<InstallerContext | null>(null);
  const [showMockTechnicalDetails, setShowMockTechnicalDetails] = useState(false);
  const [debugInstallScenario, setDebugInstallScenario] = useState<DebugInstallScenario>("update");
  const [debugExistingVersion, setDebugExistingVersion] = useState("1.3.8");
  const [debugIncomingVersion, setDebugIncomingVersion] = useState(mockPackageInfo.version);
  const {
    showBuilderGate,
    rememberBuilderGateDismissal,
    setRememberBuilderGateDismissal,
    handleBuilderGateContinue,
    handleBuilderGateCancel,
  } = useBuilderGate({ page, setPage });

  const handleSetDebugInstallScenario = (scenario: DebugInstallScenario) => {
    setDebugInstallScenario(scenario);
    if (scenario === "reinstall") {
      setDebugExistingVersion(debugIncomingVersion);
    }
  };

  const handleSetDebugReinstallVersion = (version: string) => {
    setDebugIncomingVersion(version);
    setDebugExistingVersion(version);
  };

  const { toasts, pushToast, dismissToast, pauseToast, resumeToast } = useToastManager();
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
    installPreflight,
    copyInstallPreflightDetails,
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
    installWorkflow,
    choosePackage,
    clearSelectedPackage,
    closeInstallComplete,
    openScreenshotModal,
    handleContinueFromDetails,
    continueFromTrustStep,
    continueFromLicenseStep,
    continueFromOptionsStep,
    continueFromScopeStep,
    goBackFromTrustStep,
    goBackFromLicenseStep,
    goBackFromOptionsStep,
    goBackFromScopeStep,
    goBackFromDecisionStep,
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
    handleResizeMouseDown,
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
        pushToast("error", appText("toast.installerContextLoadFailed"));
      }
    };

    void loadContext();
  }, []);

  useEffect(() => {
    const applyRouteFromHash = () => {
      const route = routeFromHash(window.location.hash);
      setPage(route.page);
      setSettingsTab(route.settingsTab);
      setInstalledReviewTarget(route.installedReviewTarget);
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
    const nextHash = hashFromRoute({ page, settingsTab, installedReviewTarget, mockInstalledReviewAppId });
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [page, settingsTab, installedReviewTarget, mockInstalledReviewAppId]);

  useEffect(() => {
    logUiAction("route-change", {
      page,
      settingsTab,
      installedReviewTarget: installedReviewTarget ?? "none",
      mockInstalledReviewAppId: mockInstalledReviewAppId ?? "none",
    });
  }, [page, settingsTab, installedReviewTarget, mockInstalledReviewAppId]);

  useEffect(() => {
    if (page !== "installedReview" || !installedReviewTarget) {
      return;
    }

    const parsedTarget = parseInstalledReviewTarget(installedReviewTarget);
    if (!parsedTarget) {
      setInstalledReviewTarget(null);
      setPage("installed");
      return;
    }

    if (
      installedAppDetails?.appId === parsedTarget.appId
      && installedAppDetails.installScope === parsedTarget.installScope
    ) {
      return;
    }

    void openInstalledAppDetailsByIdentity(
      parsedTarget.appId,
      parsedTarget.installScope,
      parsedTarget.appId,
    ).then((details) => {
      if (!details) {
        setInstalledReviewTarget(null);
        setPage("installed");
      }
    });
  }, [page, installedReviewTarget, installedAppDetails?.appId, installedAppDetails?.installScope]);

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

  useEffect(() => {
    const handleMetaFieldCopiedEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ label?: string }>;
      const label = customEvent.detail?.label;
      if (!label) {
        return;
      }
      logUiAction("meta-field-copied", { label });
      pushToast("info", appText("toast.metaCopied", { label }));
    };

    window.addEventListener("yambuck:meta-field-copied", handleMetaFieldCopiedEvent as EventListener);
    return () => {
      window.removeEventListener("yambuck:meta-field-copied", handleMetaFieldCopiedEvent as EventListener);
    };
  }, [pushToast]);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const button = target.closest("button");
      if (!button) {
        return;
      }

      const label = getInteractionLabel(button as HTMLElement);
      const buttonType = (button as HTMLButtonElement).type || "button";
      const disabled = (button as HTMLButtonElement).disabled;

      logUiAction("ui-button-press", {
        label,
        buttonType,
        disabled,
      });
    };

    window.addEventListener("click", handleGlobalClick, true);
    return () => {
      window.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);

  useEscapeKey(page === "installer" && step === "complete" && packageInfo !== null, closeInstallComplete);

  const handleMetaFieldCopied = (label: string) => {
    logUiAction("meta-field-copied", { label });
    pushToast("info", appText("toast.metaCopied", { label }));
  };

  const handleCopyToastMessage = async (message: string) => {
    try {
      await copyPlainText(message);
      logUiAction("toast-copied", { length: message.length });
    } catch {
      // toast copy is a convenience action; ignore clipboard failures
    }
  };

  const navigateToInstalledList = () => {
    if (page === "installedUninstall" && uninstallStep === "running") {
      return;
    }
    logUiAction("navigate-installed-list");
    closeUninstallWizard();
    setInstalledReviewTarget(null);
    setMockInstalledReviewAppId(null);
    closeInstalledAppDetails();
    setShowInstalledReviewTechnicalDetails(false);
    setPage("installed");
  };

  const openInstalledUninstall = (app: InstalledApp) => {
    logUiAction("navigate-installed-uninstall", {
      appId: app.appId,
      scope: app.installScope,
    });
    closeInstalledAppDetails();
    setInstalledReviewTarget(null);
    setPage("installedUninstall");
    openUninstallWizard(app);
  };

  const openInstalledReview = async (app: InstalledApp) => {
    logUiAction("navigate-installed-review", {
      appId: app.appId,
      scope: app.installScope,
    });
    const reviewTarget = makeInstalledReviewTarget(app.appId, app.installScope);
    setInstalledReviewTarget(reviewTarget);
    setShowInstalledReviewTechnicalDetails(false);
    setPage("installedReview");
    const details = await openInstalledAppDetails(app);
    if (!details) {
      setInstalledReviewTarget(null);
      setPage("installed");
    }
  };

  const navigateToMockInstalledList = () => {
    logUiAction("navigate-mock-installed-list");
    setMockInstalledReviewAppId(null);
    setShowMockInstalledReviewTechnicalDetails(false);
    setPage("mockInstalled");
  };

  const openMockInstalledUninstall = (app: InstalledApp) => {
    logUiAction("navigate-mock-installed-uninstall", { appId: app.appId });
    setMockInstalledReviewAppId(app.appId);
    setShowMockInstalledReviewTechnicalDetails(false);
    setPage("mockInstalledUninstall");
  };

  const openMockInstalledReview = (app: InstalledApp) => {
    logUiAction("navigate-mock-installed-review", { appId: app.appId });
    setMockInstalledReviewAppId(app.appId);
    setShowMockInstalledReviewTechnicalDetails(false);
    setPage("mockInstalledReview");
  };

  const renderInstallStep = () => {
    return (
        <InstallerPage
          step={step}
          packageInfo={packageInfo}
          installerWizardSteps={installWorkflow?.wizardSteps ?? null}
          checkingPreflight={checkingPreflight}
        preflightBlockedMessage={preflightBlockedMessage}
        installPreflight={installPreflight}
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
        onContinueFromScopeStep={continueFromScopeStep}
        onGoBackFromDecisionStep={goBackFromDecisionStep}
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
        onCopyInstallPreflightDetails={() => void copyInstallPreflightDetails()}
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

  const renderInstalledUninstallPage = () => {
    if (!uninstallTarget) {
      return (
        <Panel>
          <PanelHeader title={appText("app.uninstallMissingTitle")}>{appText("app.uninstallMissingBody")}</PanelHeader>
        </Panel>
      );
    }

    return (
      <UninstallFlowPage
        uninstallTarget={uninstallTarget}
        uninstallStep={uninstallStep}
        uninstallRemoveUserData={uninstallRemoveUserData}
        loadingUninstallDetails={loadingUninstallDetails}
        uninstallDetails={uninstallDetails}
        uninstallResult={uninstallResult}
        uninstallError={uninstallError}
        onClose={() => {
          if (uninstallStep === "running") {
            return;
          }
          closeUninstallWizard();
          navigateToInstalledList();
        }}
        onSetStep={setUninstallStep}
        onSetRemoveUserData={setUninstallRemoveUserData}
        onRunUninstall={() => void runUninstall()}
      />
    );
  };

  const renderPackageBuilderPage = () => (
    <PackageBuilderPage onToast={pushToast} />
  );

  const renderInstalledReviewPage = () => {
    const parsedTarget = parseInstalledReviewTarget(installedReviewTarget);
    const isMismatchedTarget = parsedTarget
      ? installedAppDetails?.appId !== parsedTarget.appId || installedAppDetails.installScope !== parsedTarget.installScope
      : true;
    if (!installedAppDetails || isMismatchedTarget) {
      return (
        <Panel>
          <PanelHeader title={appText("app.loadingReviewTitle")}>
            {loadingInstalledAppDetails ? appText("app.loadingReviewFetching") : appText("app.loadingReviewFailed")}
          </PanelHeader>
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
          openInstalledUninstall(app);
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
          <PanelHeader title={appText("app.mockReviewMissingTitle")}>{appText("app.mockReviewMissingBody")}</PanelHeader>
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
        onLaunch={() => pushToast("success", appText("app.mock.launch", { appName: details.displayName }))}
        onUninstall={() => openMockInstalledUninstall(target)}
      />
    );
  };

  const renderMockInstallFlowPage = () => (
    <MockInstallFlowPage
      scenario={debugInstallScenario}
      existingVersion={debugExistingVersion}
      incomingVersion={debugIncomingVersion}
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

  const renderMockInstalledUninstallPage = () => {
    const target = mockInstalledReviewAppId
      ? mockInstalledApps.find((candidate) => candidate.appId === mockInstalledReviewAppId)
      : null;

    if (!target) {
      return (
        <Panel>
          <PanelHeader title={appText("app.mockUninstallMissingTitle")}>{appText("app.mockUninstallMissingBody")}</PanelHeader>
        </Panel>
      );
    }

    return (
      <MockUninstallFlowPage
        target={target}
        onClose={navigateToMockInstalledList}
        onToast={pushToast}
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
      onOpenMockInstalledApps={() => {
        setMockInstalledReviewAppId(null);
        setPage("mockInstalled");
      }}
      onOpenUiDebugLab={() => {
        setSettingsTab("debug");
        setPage("uiDebugLab");
      }}
      onCopyLogs={() => void copyLogs()}
      onClearLogs={() => void clearLogs()}
    />
  );

  const renderUiDebugLabPage = () => (
    <UiDebugLabPage
      onBackToSettingsDebug={() => {
        setSettingsTab("debug");
        setPage("settings");
      }}
      onToast={pushToast}
    />
  );

  const showDebugToolbar = page === "uiDebugLab"
    || page === "mockPreview"
    || page === "mockInstallFlow"
    || page === "mockInstalled"
    || page === "mockInstalledReview"
    || page === "mockInstalledUninstall";
  const showDebugScenarioControls = page === "uiDebugLab" || page === "mockInstallFlow";

  const navigateToInstaller = () => {
    logUiAction("navigate-installer-tab");
    closeUninstallWizard();
    closeInstalledAppDetails();
    setInstalledReviewTarget(null);
    setMockInstalledReviewAppId(null);
    setPage("installer");
  };

  const navigateToPackageBuilder = () => {
    logUiAction("navigate-package-builder");
    closeUninstallWizard();
    closeInstalledAppDetails();
    setInstalledReviewTarget(null);
    setMockInstalledReviewAppId(null);
    setPage("packageBuilder");
  };

  const navigateToSettings = () => {
    logUiAction("navigate-settings");
    closeUninstallWizard();
    closeInstalledAppDetails();
    setInstalledReviewTarget(null);
    setMockInstalledReviewAppId(null);
    setPage("settings");
    setSettingsTab("general");
  };

  return (
    <main class="app-shell">
      <AppTopBar
        page={page}
        isMaximized={isMaximized}
        onTitlebarMouseDown={handleTitlebarMouseDown}
        onNavigateInstaller={navigateToInstaller}
        onNavigateInstalled={navigateToInstalledList}
        onNavigatePackageBuilder={navigateToPackageBuilder}
        onOpenSettings={navigateToSettings}
        onMinimize={() => void handleMinimize()}
        onToggleMaximize={() => void handleToggleMaximize()}
        onClose={() => void handleClose()}
      />

      <ToastHost
        toasts={toasts}
        onDismiss={dismissToast}
        onPause={pauseToast}
        onResume={resumeToast}
        onCopyMessage={(message) => void handleCopyToastMessage(message)}
      />

      <div class="resize-overlay" data-no-drag="true">
        <div class="resize-corner resize-corner-nw" data-no-drag="true" onMouseDown={(event) => void handleResizeMouseDown("NorthWest")(event)} />
        <div class="resize-corner resize-corner-ne" data-no-drag="true" onMouseDown={(event) => void handleResizeMouseDown("NorthEast")(event)} />
        <div class="resize-corner resize-corner-sw" data-no-drag="true" onMouseDown={(event) => void handleResizeMouseDown("SouthWest")(event)} />
        <div class="resize-corner resize-corner-se" data-no-drag="true" onMouseDown={(event) => void handleResizeMouseDown("SouthEast")(event)} />
      </div>

      <div class="workspace-stage" data-no-drag="true">
        <div class="workspace-content-shell">
          <section class="content-scroll">
            <AppPageRenderer
              page={page}
              renderInstaller={renderInstallStep}
              renderInstalled={renderInstalledApps}
              renderInstalledReview={renderInstalledReviewPage}
              renderInstalledUninstall={renderInstalledUninstallPage}
              renderPackageBuilder={renderPackageBuilderPage}
              renderSettings={renderSettingsPage}
              renderUiDebugLab={renderUiDebugLabPage}
              renderMockInstalled={renderMockInstalledAppsPage}
              renderMockInstalledReview={renderMockInstalledReviewPage}
              renderMockInstalledUninstall={renderMockInstalledUninstallPage}
              renderMockInstallFlow={renderMockInstallFlowPage}
              renderMockPreview={renderMockPreviewPage}
            />
          </section>
          <div id="app-modal-host" class="modal-host" data-no-drag="true" />
        </div>

        {showDebugToolbar ? (
          <DebugControlToolbar
            showScenarioControls={showDebugScenarioControls}
            scenario={debugInstallScenario}
            onSetScenario={handleSetDebugInstallScenario}
            existingVersion={debugExistingVersion}
            incomingVersion={debugIncomingVersion}
            onSetExistingVersion={setDebugExistingVersion}
            onSetIncomingVersion={setDebugIncomingVersion}
            onSetReinstallVersion={handleSetDebugReinstallVersion}
          />
        ) : null}

        <footer class="app-footer">
          <div class="footer-meta">
            <span class="footer-version">
              {context ? `Yambuck v${context.appVersion}` : appText("app.footer.productFallback")}
            </span>
            {hasUpdateAvailable ? (
              <button
                class="footer-action update"
                onClick={() => {
                  logUiAction("open-update-modal");
                  openUpdateModal();
                }}
              >
                {appText("app.footer.updateAvailable")}
              </button>
            ) : null}
          </div>
          <a class="footer-link" href="https://github.com/yambuck/yambuck" target="_blank" rel="noreferrer">
            <IconBrandGithub size={16} />
            {appText("app.footer.github")}
          </a>
        </footer>

        <AppModalHost
          isUpdateModalOpen={isUpdateModalOpen}
          updateResult={updateResult}
          applyingUpdate={applyingUpdate}
          lastCheckedLabel={relativeLastChecked()}
          onCloseUpdateModal={closeUpdateModal}
          onUpdateAndRestart={() => void handleUpdateAndRestart()}
          licenseViewer={licenseViewer}
          onCloseLicenseViewer={closeLicenseViewer}
          activeScreenshotIndex={activeScreenshotIndex}
          screenshotGallery={screenshotGallery}
          onCloseScreenshotModal={closeScreenshotModal}
          onPreviousScreenshot={() => cycleScreenshot(-1)}
          onNextScreenshot={() => cycleScreenshot(1)}
          showBuilderGate={showBuilderGate}
          rememberBuilderGateDismissal={rememberBuilderGateDismissal}
          onSetRememberBuilderGateDismissal={setRememberBuilderGateDismissal}
          onBuilderGateCancel={handleBuilderGateCancel}
          onBuilderGateContinue={handleBuilderGateContinue}
        />
      </div>
    </main>
  );
}

export default App;
