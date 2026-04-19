import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "preact/hooks";
import {
  completeInstall as completeInstallApi,
  createInstallPreview as createInstallPreviewApi,
  discardInstallWorkflow,
  getInstallDecision,
  getStartupPackageArg,
  inspectPackageWorkflow,
  listInstalledApps,
  preflightInstallCheck,
  uninstallInstalledApp,
  validateInstallOptions,
} from "../lib/tauri/api";
import type {
  AppPage,
  ExternalPackageOpenPayload,
  InstallDecision,
  InstallOptionSubmission,
  InstallOptionValue,
  InstallWorkflow,
  InstallPreview,
  InstallScope,
  InstalledApp,
  PackageInfo,
  WizardStep,
} from "../types/app";

const EXTERNAL_PACKAGE_OPEN_EVENT = "yambuck://open-package";

type UseInstallerFlowOptions = {
  setPage: (page: AppPage) => void;
  onRefreshInstalledApps: () => Promise<void>;
  onLaunchInstalledApp: (app: InstalledApp) => Promise<void>;
  onToast: (tone: "info" | "success" | "warning" | "error", message: string, durationMs?: number) => void;
};

export const useInstallerFlow = ({
  setPage,
  onRefreshInstalledApps,
  onLaunchInstalledApp,
  onToast,
}: UseInstallerFlowOptions) => {
  const [step, setStep] = useState<WizardStep>("details");
  const [scope, setScope] = useState<InstallScope>("user");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready to install package");
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [installWorkflow, setInstallWorkflow] = useState<InstallWorkflow | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [preview, setPreview] = useState<InstallPreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [preflightBlockedMessage, setPreflightBlockedMessage] = useState("");
  const [checkingPreflight, setCheckingPreflight] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState<number | null>(null);
  const [screenshotGallery, setScreenshotGallery] = useState<string[]>([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showCompleteTechnicalDetails, setShowCompleteTechnicalDetails] = useState(false);
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [licenseViewer, setLicenseViewer] = useState<{ title: string; text: string } | null>(null);
  const [installOptionValues, setInstallOptionValues] = useState<Record<string, InstallOptionValue>>({});
  const [installOptionError, setInstallOptionError] = useState("");
  const [validatingInstallOptions, setValidatingInstallOptions] = useState(false);
  const [managedExistingInstall, setManagedExistingInstall] = useState(false);
  const [installDecision, setInstallDecision] = useState<InstallDecision | null>(null);
  const [wipeOnReinstall, setWipeOnReinstall] = useState(false);
  const [confirmWipeOnReinstall, setConfirmWipeOnReinstall] = useState(false);
  const [allowDowngrade, setAllowDowngrade] = useState(false);

  const getStepNext = useCallback(
    (currentStep: WizardStep, fallback: WizardStep): WizardStep => {
      if (!installWorkflow) {
        return fallback;
      }
      const currentIndex = installWorkflow.wizardSteps.indexOf(currentStep);
      const nextStep =
        currentIndex >= 0 ? installWorkflow.wizardSteps[currentIndex + 1] : undefined;
      return nextStep ?? fallback;
    },
    [installWorkflow],
  );

  const getStepPrevious = useCallback(
    (currentStep: WizardStep, fallback: WizardStep): WizardStep => {
      if (!installWorkflow) {
        return fallback;
      }
      const currentIndex = installWorkflow.wizardSteps.indexOf(currentStep);
      const previousStep = currentIndex > 0 ? installWorkflow.wizardSteps[currentIndex - 1] : undefined;
      return previousStep ?? fallback;
    },
    [installWorkflow],
  );

  const serializeInstallOptions = useCallback(
    (values: Record<string, InstallOptionValue>): InstallOptionSubmission[] =>
      Object.entries(values).map(([id, value]) => ({ id, value })),
    [],
  );

  const initializeInstallOptionValues = useCallback((workflow: InstallWorkflow) => {
    const defaults: Record<string, InstallOptionValue> = {};
    for (const option of workflow.installOptions) {
      if (option.defaultValue === undefined) {
        continue;
      }
      if (option.inputType === "checkbox") {
        defaults[option.id] = { type: "checkbox", value: option.defaultValue === "true" };
      } else if (option.inputType === "select") {
        defaults[option.id] = { type: "select", value: option.defaultValue };
      } else {
        defaults[option.id] = { type: "text", value: option.defaultValue };
      }
    }
    setInstallOptionValues(defaults);
  }, []);

  const clearSelectedPackage = useCallback(() => {
    const activeWorkflowId = workflowId;
    if (activeWorkflowId) {
      void discardInstallWorkflow(activeWorkflowId);
    }

    setPackageInfo(null);
    setInstallWorkflow(null);
    setWorkflowId(null);
    setPreview(null);
    setStep("details");
    setPreflightBlockedMessage("");
    setActiveScreenshotIndex(null);
    setScreenshotGallery([]);
    setShowTechnicalDetails(false);
    setShowCompleteTechnicalDetails(false);
    setLicenseAccepted(false);
    setLicenseViewer(null);
    setInstallOptionValues({});
    setInstallOptionError("");
    setValidatingInstallOptions(false);
    setManagedExistingInstall(false);
    setInstallDecision(null);
    setWipeOnReinstall(false);
    setConfirmWipeOnReinstall(false);
    setAllowDowngrade(false);
  }, [workflowId]);

  const installOptions = installWorkflow?.installOptions ?? [];

  const closeInstallComplete = useCallback(() => {
    clearSelectedPackage();
    setPage("installed");
  }, [clearSelectedPackage, setPage]);

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
      if (workflowId) {
        await discardInstallWorkflow(workflowId);
      }

      const inspected = await inspectPackageWorkflow(packageFile);
      setWorkflowId(inspected.workflowId);
      setInstallWorkflow(inspected.workflow);
      setPackageInfo(inspected.workflow.packageInfo);
      setShowTechnicalDetails(false);
      setShowCompleteTechnicalDetails(false);
      setLicenseAccepted(false);
      setLicenseViewer(null);
      initializeInstallOptionValues(inspected.workflow);
      setStep(inspected.workflow.wizardSteps[0] ?? "details");
      setPreview(null);
      setPreflightBlockedMessage("");
      setInstallOptionError("");
      setManagedExistingInstall(false);
      setInstallDecision(null);
      setWipeOnReinstall(false);
      setConfirmWipeOnReinstall(false);
      setAllowDowngrade(false);
      setPage("installer");
    } catch {
      onToast("error", "Unable to open package. Choose a valid .yambuck file.");
    }
  };

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
      onToast("error", "Unable to open file picker. Check app permissions and try again.");
      return;
    }

    if (!selected) {
      return;
    }

    await loadPackageFromPath(selected);
  };

  useEffect(() => {
    const openStartupPackage = async () => {
      try {
        const startupPath = await getStartupPackageArg();
        if (!startupPath) {
          return;
        }
        await loadPackageFromPath(startupPath);
      } catch {
        onToast("error", "Could not open startup package argument.");
      }
    };

    void openStartupPackage();
  }, []);

  useEffect(() => {
    let detachListener: (() => void) | undefined;

    void listen<ExternalPackageOpenPayload>(EXTERNAL_PACKAGE_OPEN_EVENT, (event) => {
      const packageFile = event.payload?.packageFile;
      if (!packageFile) {
        return;
      }

      if (isInstallFlowLocked()) {
        onToast("warning", "Finish or cancel the current install before opening another package.");
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

  const handleContinueFromDetails = async () => {
    if (!packageInfo) {
      onToast("warning", "Choose a .yambuck package first.");
      return;
    }

    setCheckingPreflight(true);
    try {
      const result = await preflightInstallCheck(packageInfo.appId);

      if (result.status === "external_conflict") {
        setPreflightBlockedMessage(result.message);
        onToast("error", result.message, 5200);
        return;
      }

      setPreflightBlockedMessage("");
      setManagedExistingInstall(false);
      setInstallDecision(null);

      if (!workflowId) {
        onToast("error", "Install workflow session missing. Reopen the package and try again.");
        return;
      }

      const decision = await getInstallDecision(workflowId);
      setInstallDecision(decision);

      if (decision.action === "blocked_identity_mismatch") {
        setPreflightBlockedMessage(decision.message);
        onToast("error", decision.message, 6200);
        return;
      }

      if (decision.action === "update") {
        setManagedExistingInstall(true);
        onToast("info", decision.message);
      } else if (decision.action === "reinstall") {
        setManagedExistingInstall(true);
        onToast("info", decision.message);
      } else if (decision.action === "downgrade") {
        setManagedExistingInstall(true);
        onToast("warning", decision.message, 6200);
      } else if (result.status === "managed_existing") {
        setManagedExistingInstall(true);
      }

      setStep("trust");
    } catch {
      onToast("error", "Could not run install safety checks.");
    } finally {
      setCheckingPreflight(false);
    }
  };

  const continueFromTrustStep = () => {
    if (!packageInfo || !workflowId) {
      return;
    }
    setStep(getStepNext("trust", "scope"));
  };

  const continueFromLicenseStep = () => {
    setStep(getStepNext("license", "scope"));
  };

  const continueFromOptionsStep = async () => {
    if (!packageInfo || !workflowId) {
      return;
    }

    setValidatingInstallOptions(true);
    setInstallOptionError("");
    try {
      const normalized = await validateInstallOptions(
        workflowId,
        serializeInstallOptions(installOptionValues),
      );
      const normalizedValues: Record<string, InstallOptionValue> = {};
      for (const submission of normalized) {
        normalizedValues[submission.id] = submission.value;
      }
      setInstallOptionValues(normalizedValues);
      setStep(getStepNext("options", "scope"));
    } catch {
      const message = "Installer options are invalid. Review values and try again.";
      setInstallOptionError(message);
      onToast("error", message);
    } finally {
      setValidatingInstallOptions(false);
    }
  };

  const goBackFromTrustStep = () => {
    setStep(getStepPrevious("trust", "details"));
  };

  const goBackFromLicenseStep = () => {
    setStep(getStepPrevious("license", "trust"));
  };

  const goBackFromOptionsStep = () => {
    setStep(getStepPrevious("options", "license"));
  };

  const goBackFromScopeStep = () => {
    setStep(getStepPrevious("scope", "trust"));
  };

  const setInstallOptionValue = (id: string, value: InstallOptionValue) => {
    setInstallOptionValues((current) => ({
      ...current,
      [id]: value,
    }));
    if (installOptionError) {
      setInstallOptionError("");
    }
  };

  const setReinstallWipeChoice = (value: boolean) => {
    setWipeOnReinstall(value);
    if (!value) {
      setConfirmWipeOnReinstall(false);
    }
  };

  const setDowngradeAllowed = (value: boolean) => {
    setAllowDowngrade(value);
  };

  const openLicenseViewer = (title: string, text: string) => {
    setLicenseViewer({ title, text });
  };

  const closeLicenseViewer = () => {
    setLicenseViewer(null);
  };

  const completeInstall = async (
    selectedPackage: PackageInfo,
    installPreview: InstallPreview,
    installScope: InstallScope,
  ) => {
    try {
      if (!workflowId) {
        throw new Error("Missing workflow session");
      }

      await completeInstallApi(
        workflowId,
        installScope,
        installPreview.destinationPath,
        serializeInstallOptions(installOptionValues),
        allowDowngrade,
      );
      onToast("success", `${selectedPackage.displayName} installed.`);
      await onRefreshInstalledApps();
    } catch {
      onToast("error", "Install finished with issues. Could not update installed apps index.");
    }
  };

  const startInstall = async () => {
    if (!packageInfo || !workflowId) {
      onToast("warning", "Choose a .yambuck package before installing.");
      return;
    }

    const selectedPackage = packageInfo;

    if (selectedPackage.requiresLicenseAcceptance && !licenseAccepted) {
      onToast("warning", "You must accept the license before installing.");
      setStep("license");
      return;
    }

    setPreflightBlockedMessage("");

    if (installDecision?.action === "downgrade" && !allowDowngrade) {
      onToast("warning", "Downgrade requires explicit confirmation before install.");
      setStep("scope");
      return;
    }

    if (managedExistingInstall && wipeOnReinstall) {
      if (!confirmWipeOnReinstall) {
        onToast("warning", "Confirm data wipe before reinstalling.");
        setStep("scope");
        return;
      }

      try {
        const installedApps = await listInstalledApps();
        const existing = installedApps.find((installed) => installed.appId === selectedPackage.appId);
        if (existing) {
          await uninstallInstalledApp(existing.appId, existing.installScope, true);
          onToast("info", "Existing install and app data removed. Continuing reinstall.");
        }
      } catch {
        onToast("error", "Could not remove existing install before reinstall.");
        return;
      }
    }

    if (installWorkflow?.wizardSteps.includes("options")) {
      try {
        if (!workflowId) {
          throw new Error("Missing workflow session");
        }
        await validateInstallOptions(workflowId, serializeInstallOptions(installOptionValues));
      } catch {
        const message = "Installer options are invalid. Review values and try again.";
        setInstallOptionError(message);
        onToast("error", message);
        setStep("options");
        return;
      }
    }

    try {
      const preflight = await preflightInstallCheck(selectedPackage.appId);
      if (preflight.status === "external_conflict") {
        setPreflightBlockedMessage(preflight.message);
        onToast("error", preflight.message, 5200);
        return;
      }
    } catch {
      onToast("error", "Could not verify install ownership safety.");
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
        workflowId,
        scope,
        verifiedPublisher,
      );
      setPreview(installPreview);
    } catch {
      onToast("error", "Failed to generate install preview.");
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

  const launchCurrentPackage = async () => {
    if (!packageInfo) {
      onToast("warning", "No package selected to launch.");
      return;
    }

    await onLaunchInstalledApp({
      appId: packageInfo.appId,
      displayName: packageInfo.displayName,
      version: packageInfo.version,
      installScope: scope,
      installedAt: "",
    });
  };

  return {
    step,
    setStep,
    scope,
    setScope,
    progress,
    statusText,
    packageInfo,
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
  };
};
