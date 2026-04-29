import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "preact/hooks";
import {
  completeInstall as completeInstallApi,
  createInstallPreview as createInstallPreviewApi,
  discardInstallWorkflow,
  evaluateInstallPreflight,
  getInstallDecision,
  openLogsDirectory,
  getRecentLogs,
  getStartupPackageArg,
  inspectPackageWorkflow,
  listInstalledApps,
  uninstallInstalledApp,
  validateInstallOptions,
} from "../lib/tauri/api";
import { logUiAction, logUiError } from "../lib/ui-log";
import { copyPlainText } from "../utils/clipboard";
import { installerDecisionMessage, installerText } from "../i18n/installer";
import { toIso8601WithOffset, toReadableLocalTimeWithOffset } from "../utils/time";
import type {
  AppPage,
  ExternalPackageOpenPayload,
  InstallPreflightResult,
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

const normalizeOpenPackageError = (error: unknown): string => {
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed || "Package validation failed.";
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed || "Package validation failed.";
  }

  return "Package validation failed.";
};

type InstallFailureState = {
  summary: string;
  details: string;
  capturedAtIso8601: string;
  capturedAtDisplay: string;
};

type InstallLifecycleState =
  | "queued"
  | "downloading"
  | "validating"
  | "installing"
  | "verifying"
  | "success"
  | "failed";

const normalizeInstallFailureMessage = (error: unknown): string => {
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "Install failed. Check details and try again.";
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
  const [statusText, setStatusText] = useState(installerText("status.queued"));
  const [installLifecycleState, setInstallLifecycleState] = useState<InstallLifecycleState>("queued");
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [installWorkflow, setInstallWorkflow] = useState<InstallWorkflow | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [preview, setPreview] = useState<InstallPreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [preflightBlockedMessage, setPreflightBlockedMessage] = useState("");
  const [installPreflight, setInstallPreflight] = useState<InstallPreflightResult | null>(null);
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
  const [packageOpenError, setPackageOpenError] = useState<{
    packageFile: string;
    message: string;
    capturedAtIso8601: string;
    capturedAtDisplay: string;
  } | null>(null);
  const [installFailure, setInstallFailure] = useState<InstallFailureState | null>(null);

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
    logUiAction("installer-clear-selected-package", {
      workflowId: workflowId ?? "none",
    });
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
    setPackageOpenError(null);
    setInstallFailure(null);
    setInstallPreflight(null);
  }, [workflowId]);

  const runInstallPreflight = useCallback(async (activeWorkflowId: string) => {
    const preflight = await evaluateInstallPreflight(activeWorkflowId);
    setInstallPreflight(preflight);
    if (preflight.status === "blocked") {
      setPreflightBlockedMessage(preflight.message);
      return preflight;
    }

    setPreflightBlockedMessage("");
    return preflight;
  }, []);

  const installOptions = installWorkflow?.installOptions ?? [];

  const closeInstallComplete = useCallback(() => {
    logUiAction("installer-close-complete");
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

    return step === "trust" || step === "license" || step === "scope" || step === "decision" || step === "progress";
  };

  const loadPackageFromPath = async (packageFile: string) => {
    logUiAction("installer-open-package-start", { packageFile });
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
      setPackageOpenError(null);
      setInstallFailure(null);
      setInstallPreflight(null);
      setPage("installer");
      logUiAction("installer-open-package-success", {
        appId: inspected.workflow.packageInfo.appId,
        workflowId: inspected.workflowId,
      });
    } catch (error) {
      const message = normalizeOpenPackageError(error);
      const capturedAt = new Date();
      setPackageInfo(null);
      setInstallWorkflow(null);
      setWorkflowId(null);
      setPreview(null);
      setStep("details");
      setPreflightBlockedMessage("");
      setInstallOptionValues({});
      setInstallOptionError("");
      setManagedExistingInstall(false);
      setInstallDecision(null);
      setWipeOnReinstall(false);
      setConfirmWipeOnReinstall(false);
      setAllowDowngrade(false);
      setInstallFailure(null);
      setInstallPreflight(null);
      setPackageOpenError({
        packageFile,
        message,
        capturedAtIso8601: toIso8601WithOffset(capturedAt),
        capturedAtDisplay: toReadableLocalTimeWithOffset(capturedAt),
      });
      setPage("installer");
      logUiError("installer-open-package-failed", {
        packageFile,
        reason: message,
      });
      onToast("error", installerText("toast.packageOpenFailed"));
    }
  };

  const copyPackageOpenErrorDetails = async () => {
    if (!packageOpenError) {
      return;
    }

    const details = [
      "Yambuck package validation error",
      `Time: ${packageOpenError.capturedAtIso8601}`,
      `Package: ${packageOpenError.packageFile}`,
      `Error: ${packageOpenError.message}`,
    ].join("\n");

    try {
      await copyPlainText(details);

      onToast("success", installerText("toast.errorDetailsCopied"));
    } catch {
      onToast("error", installerText("toast.errorDetailsCopyFailed"));
    }
  };

  const copyInstallFailureDetails = async () => {
    if (!installFailure || !packageInfo) {
      return;
    }

    const details = [
      "Yambuck install failure",
      `Time: ${installFailure.capturedAtIso8601}`,
      `App: ${packageInfo.displayName}`,
      `App ID: ${packageInfo.appId}`,
      `Scope: ${scope}`,
      `Summary: ${installFailure.summary}`,
      "",
      "Technical details:",
      installFailure.details,
    ].join("\n");

    try {
      await copyPlainText(details);
      onToast("success", installerText("toast.installFailureDetailsCopied"));
    } catch {
      onToast("error", installerText("toast.installFailureDetailsCopyFailed"));
    }
  };

  const copyInstallPreflightDetails = async () => {
    if (!installPreflight) {
      onToast("warning", installerText("toast.noPreflightReport"));
      return;
    }

    const capturedAt = toIso8601WithOffset(new Date());
    const reasonLines = installPreflight.reasons.length === 0
      ? ["- none"]
      : installPreflight.reasons.flatMap((reason) => [
        `- [${reason.code}] ${reason.message}`,
        ...(reason.technicalDetails ? [`  technical: ${reason.technicalDetails}`] : []),
      ]);
    const runtimeDependencyLines = installPreflight.runtimeDependencyIssues.length === 0
      ? ["- none"]
      : installPreflight.runtimeDependencyIssues.flatMap((issue) => [
        `- [${issue.severity}] [${issue.reasonCode}] (${issue.checkType}:${issue.id}) ${issue.message}`,
        ...(issue.technicalHint ? [`  hint: ${issue.technicalHint}`] : []),
        ...(issue.technicalDetails ? [`  technical: ${issue.technicalDetails}`] : []),
      ]);

    const details = [
      "Yambuck install compatibility report",
      `Time: ${capturedAt}`,
      `Status: ${installPreflight.status}`,
      "",
      "Package:",
      `- Display name: ${installPreflight.package.displayName}`,
      `- Version: ${installPreflight.package.version}`,
      `- App ID: ${installPreflight.package.appId}`,
      `- Package UUID: ${installPreflight.package.packageUuid}`,
      `- Target: ${installPreflight.package.selectedTargetId ?? "none"}`,
      "",
      "Host:",
      `- OS: ${installPreflight.host.os}`,
      `- Arch: ${installPreflight.host.arch}`,
      `- Distro: ${installPreflight.host.distro}`,
      `- Kernel: ${installPreflight.host.kernelVersion}`,
      `- Desktop: ${installPreflight.host.desktopEnvironment}`,
      `- Session: ${installPreflight.host.sessionType}`,
      "",
      "Reasons:",
      ...reasonLines,
      "",
      "Runtime dependency issues:",
      ...runtimeDependencyLines,
      "",
      `Summary: ${installPreflight.message}`,
      "Action: Please contact the app developer or publisher and share this report.",
    ].join("\n");

    try {
      await copyPlainText(details);
      onToast("success", installerText("toast.compatibilityReportCopied"));
    } catch {
      onToast("error", installerText("toast.compatibilityReportCopyFailed"));
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
      logUiError("installer-choose-package-dialog-failed");
      onToast("error", installerText("toast.filePickerUnavailable"));
      return;
    }

    if (!selected) {
      logUiAction("installer-choose-package-cancelled");
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
        logUiError("installer-open-startup-package-failed");
        onToast("error", installerText("toast.startupPackageOpenFailed"));
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
        logUiAction("installer-external-open-blocked", { reason: "install-flow-locked" });
        onToast("warning", installerText("toast.finishCurrentInstallFirst"));
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
      logUiAction("installer-continue-from-details-blocked", { reason: "no-package" });
      onToast("warning", installerText("toast.choosePackageFirst"));
      return;
    }

    logUiAction("installer-preflight-start", { appId: packageInfo.appId, scope });
    setCheckingPreflight(true);
    try {
      if (!workflowId) {
        logUiError("installer-preflight-failed", {
          appId: packageInfo.appId,
          reason: "missing-workflow-session",
        });
        onToast("error", installerText("toast.workflowMissing"));
        return;
      }

      const result = await runInstallPreflight(workflowId);

      if (result.status === "blocked") {
        logUiError("installer-preflight-blocked", {
          appId: packageInfo.appId,
          status: result.status,
        });
        onToast("error", result.message, 5600);
        return;
      }

      setManagedExistingInstall(false);
      setInstallDecision(null);

      const decision = await getInstallDecision(workflowId, scope);
      setInstallDecision(decision);

      if (decision.action === "blocked_identity_mismatch") {
        logUiError("installer-decision-blocked", {
          appId: packageInfo.appId,
          action: decision.action,
        });
        setPreflightBlockedMessage(decision.message);
        onToast("error", installerDecisionMessage(decision), 6200);
        return;
      }

      const isScopedExisting =
        decision.action === "update"
        || decision.action === "reinstall"
        || decision.action === "downgrade";
      setManagedExistingInstall(isScopedExisting);
      if (decision.action === "downgrade") {
        onToast("warning", installerDecisionMessage(decision), 6200);
      } else if (isScopedExisting) {
        onToast("info", installerDecisionMessage(decision));
      }

      setStep("trust");
      logUiAction("installer-preflight-success", {
        appId: packageInfo.appId,
        action: decision.action,
        status: result.status,
      });
    } catch {
      logUiError("installer-preflight-failed", {
        appId: packageInfo.appId,
        reason: "exception",
      });
      onToast("error", installerText("toast.safetyChecksFailed"));
    } finally {
      setCheckingPreflight(false);
    }
  };

  useEffect(() => {
    const refreshDecisionForSelectedScope = async () => {
      if (step !== "scope" || !workflowId) {
        return;
      }

      try {
        const decision = await getInstallDecision(workflowId, scope);
        setInstallDecision(decision);
        const isScopedExisting =
          decision.action === "update"
          || decision.action === "reinstall"
          || decision.action === "downgrade";
        setManagedExistingInstall(isScopedExisting);
      } catch {
        setInstallDecision(null);
        setManagedExistingInstall(false);
      }
    };

    void refreshDecisionForSelectedScope();
  }, [step, workflowId, scope]);

  const continueFromTrustStep = () => {
    if (!packageInfo || !workflowId) {
      return;
    }
    logUiAction("installer-continue-trust", { appId: packageInfo.appId, scope });
    setStep(getStepNext("trust", "scope"));
  };

  const continueFromLicenseStep = () => {
    logUiAction("installer-continue-license", { accepted: licenseAccepted });
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
      logUiAction("installer-options-valid", {
        optionCount: Object.keys(normalizedValues).length,
      });
      setStep(getStepNext("options", "scope"));
    } catch {
      const message = installerText("toast.invalidOptions");
      setInstallOptionError(message);
      logUiError("installer-options-invalid");
      onToast("error", message);
    } finally {
      setValidatingInstallOptions(false);
    }
  };

  const goBackFromTrustStep = () => {
    logUiAction("installer-back-trust");
    setStep(getStepPrevious("trust", "details"));
  };

  const goBackFromLicenseStep = () => {
    logUiAction("installer-back-license");
    setStep(getStepPrevious("license", "trust"));
  };

  const goBackFromOptionsStep = () => {
    logUiAction("installer-back-options");
    setStep(getStepPrevious("options", "license"));
  };

  const goBackFromScopeStep = () => {
    logUiAction("installer-back-scope");
    setStep(getStepPrevious("scope", "trust"));
  };

  const continueFromScopeStep = () => {
    const hasDecisionStep = installWorkflow?.wizardSteps.includes("decision") ?? false;
    const routeToDecision = managedExistingInstall;

    logUiAction("installer-continue-scope", {
      scope,
      workflowReady: Boolean(workflowId),
      hasDecisionStep,
      managedExistingInstall,
      route: routeToDecision ? "decision" : "start-install",
    });

    if (routeToDecision) {
      setStep("decision");
      return;
    }

    void startInstall();
  };

  const goBackFromDecisionStep = () => {
    logUiAction("installer-back-decision");
    setStep(getStepPrevious("decision", "scope"));
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
    logUiAction("installer-set-reinstall-wipe", { value });
    setWipeOnReinstall(value);
    if (!value) {
      setConfirmWipeOnReinstall(false);
    }
  };

  const setDowngradeAllowed = (value: boolean) => {
    logUiAction("installer-set-downgrade-allowed", { value });
    setAllowDowngrade(value);
  };

  const openLicenseViewer = (title: string, text: string) => {
    logUiAction("installer-open-license-viewer", { title });
    setLicenseViewer({ title, text });
  };

  const closeLicenseViewer = () => {
    logUiAction("installer-close-license-viewer");
    setLicenseViewer(null);
  };

  const handleInstallFailure = async (
    selectedPackage: PackageInfo,
    installScope: InstallScope,
    error: unknown,
  ) => {
    const capturedAt = new Date();
    const summary = normalizeInstallFailureMessage(error);
    let recentLogs = "";

    try {
      recentLogs = await getRecentLogs(220);
    } catch {
      recentLogs = "Could not load recent logs from the runtime log store.";
    }

    const logSection = recentLogs.trim() ? recentLogs.trim() : "(No recent logs found.)";
    const details = [
      `Error: ${summary}`,
      `Package: ${selectedPackage.packageFile}`,
      `App ID: ${selectedPackage.appId}`,
      `Scope: ${installScope}`,
      `Time: ${toIso8601WithOffset(capturedAt)}`,
      "",
      "Recent logs:",
      logSection,
    ].join("\n");

    setInstallFailure({
      summary,
      details,
      capturedAtIso8601: toIso8601WithOffset(capturedAt),
      capturedAtDisplay: toReadableLocalTimeWithOffset(capturedAt),
    });
    setIsBusy(false);
    setInstallLifecycleState("failed");
    setStatusText(installerText("status.failed"));
    setProgress(100);
    setStep("failed");
    logUiError("install-attempt-failed", {
      appId: selectedPackage.appId,
      scope: installScope,
      reason: summary,
    });
    onToast("error", installerText("toast.installFailed"), 5200);
  };

  const completeInstall = async (
    selectedPackage: PackageInfo,
    installPreview: InstallPreview,
    installScope: InstallScope,
  ): Promise<boolean> => {
    try {
      if (!workflowId) {
        throw new Error("Missing workflow session");
      }

      logUiAction("install-complete-request-start", {
        appId: selectedPackage.appId,
        scope: installScope,
        workflowId,
        destinationPath: installPreview.destinationPath,
        submissionCount: Object.keys(installOptionValues).length,
      });

      await completeInstallApi(
        workflowId,
        installScope,
        installPreview.destinationPath,
        serializeInstallOptions(installOptionValues),
        allowDowngrade,
      );

      logUiAction("install-complete-request-success", {
        appId: selectedPackage.appId,
        scope: installScope,
      });

      logUiAction("install-attempt-success", {
        appId: selectedPackage.appId,
        scope: installScope,
      });
      onToast("success", installerText("toast.installSucceeded", { appName: selectedPackage.displayName }));
      try {
        await onRefreshInstalledApps();
      } catch {
        onToast("warning", installerText("toast.installSucceededRefreshWarning"));
      }
      return true;
    } catch (error) {
      logUiError("install-complete-request-failed", {
        appId: selectedPackage.appId,
        scope: installScope,
      });
      await handleInstallFailure(selectedPackage, installScope, error);
      return false;
    }
  };

  async function startInstall() {
    logUiAction("install-start-clicked", {
      step,
      scope,
      hasPackage: Boolean(packageInfo),
      hasWorkflow: Boolean(workflowId),
      isBusy,
    });

    if (!packageInfo || !workflowId) {
      logUiAction("install-attempt-blocked", { reason: "no-package-or-workflow" });
      onToast("warning", installerText("toast.choosePackageBeforeInstall"));
      return;
    }

    const selectedPackage = packageInfo;

    if (selectedPackage.requiresLicenseAcceptance && !licenseAccepted) {
      logUiAction("install-attempt-blocked", {
        appId: selectedPackage.appId,
        reason: "license-not-accepted",
      });
      onToast("warning", installerText("toast.acceptLicenseToContinue"));
      setStep("license");
      return;
    }

    setPreflightBlockedMessage("");

    if (installDecision?.action === "downgrade" && !allowDowngrade) {
      logUiAction("install-attempt-blocked", {
        appId: selectedPackage.appId,
        reason: "downgrade-not-confirmed",
      });
      onToast("warning", installerText("toast.confirmDowngradeToContinue"));
      setStep("decision");
      return;
    }

    if (managedExistingInstall && wipeOnReinstall) {
      if (!confirmWipeOnReinstall) {
        logUiAction("install-attempt-blocked", {
          appId: selectedPackage.appId,
          reason: "wipe-not-confirmed",
        });
        onToast("warning", installerText("toast.confirmDataRemovalToContinue"));
        setStep("decision");
        return;
      }

      try {
        const installedApps = await listInstalledApps();
        const existing = installedApps.find(
          (installed) => installed.appId === selectedPackage.appId && installed.installScope === scope,
        );
        if (existing) {
          logUiAction("install-reinstall-uninstall-start", {
            appId: existing.appId,
            scope: existing.installScope,
          });
          await uninstallInstalledApp(existing.appId, existing.installScope, true);
          logUiAction("install-reinstall-uninstall-success", {
            appId: existing.appId,
            scope: existing.installScope,
          });
          onToast("info", installerText("toast.existingInstallRemoved"));
        }
      } catch {
        logUiError("install-reinstall-uninstall-failed", {
          appId: selectedPackage.appId,
          scope,
        });
        onToast("error", installerText("toast.removeExistingFailed"));
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
        const message = installerText("toast.invalidOptions");
        setInstallOptionError(message);
        logUiError("install-attempt-blocked", {
          appId: selectedPackage.appId,
          reason: "invalid-options",
        });
        onToast("error", message);
        setStep("options");
        return;
      }
    }

    try {
      if (!workflowId) {
        throw new Error("Missing workflow session");
      }

      logUiAction("install-preflight-start", {
        appId: selectedPackage.appId,
        scope,
        workflowId,
      });

      const preflight = await runInstallPreflight(workflowId);
      if (preflight.status === "blocked") {
        logUiError("install-attempt-blocked", {
          appId: selectedPackage.appId,
          reason: "preflight-blocked",
        });
        onToast("error", preflight.message, 5600);
        return;
      }

      logUiAction("install-preflight-passed", {
        appId: selectedPackage.appId,
        scope,
      });
    } catch {
      logUiError("install-attempt-blocked", {
        appId: selectedPackage.appId,
        reason: "preflight-check-failed",
      });
      onToast("error", installerText("toast.verifyOwnershipFailed"));
      return;
    }

    logUiAction("install-attempt-start", {
      appId: selectedPackage.appId,
      scope,
      allowDowngrade,
      managedExistingInstall,
      wipeOnReinstall,
    });

    setIsBusy(true);
    setInstallLifecycleState("queued");
    setStep("progress");
    setProgress(0);
    setInstallFailure(null);
    setStatusText(installerText("status.queued"));

    setInstallLifecycleState("downloading");
    setStatusText(installerText("status.loadingPayload"));

    const verifiedPublisher = packageInfo.trustStatus === "verified";
    let installPreview: InstallPreview;

    try {
      logUiAction("install-preview-request-start", {
        appId: selectedPackage.appId,
        scope,
        workflowId,
      });

      installPreview = await createInstallPreviewApi(
        workflowId,
        scope,
        verifiedPublisher,
      );

      logUiAction("install-preview-request-success", {
        appId: selectedPackage.appId,
        scope,
        destinationPath: installPreview.destinationPath,
      });

      setPreview(installPreview);
      setInstallLifecycleState("validating");
      setProgress(30);
      setStatusText(installerText("status.validating"));
    } catch {
      logUiError("install-preview-failed", {
        appId: selectedPackage.appId,
        scope,
      });
      onToast("error", installerText("toast.installPreviewFailed"));
      setIsBusy(false);
      setStep("decision");
      return;
    }

    setInstallLifecycleState("installing");
    setProgress(58);
    setStatusText(installerText("status.installing"));

    setInstallLifecycleState("verifying");
    setProgress(84);
    setStatusText(installerText("status.verifying"));

    const completed = await completeInstall(selectedPackage, installPreview, scope);
    if (!completed) {
      return;
    }

    logUiAction("install-attempt-complete", {
      appId: selectedPackage.appId,
      scope,
    });

    setInstallLifecycleState("success");
    setStatusText(installerText("status.complete"));
    setProgress(100);
    setIsBusy(false);
    setStep("complete");
  }

  const launchCurrentPackage = async () => {
    if (!packageInfo) {
      logUiAction("installer-launch-current-blocked", { reason: "no-package" });
      onToast("warning", installerText("toast.noPackageToLaunch"));
      return;
    }

    logUiAction("installer-launch-current", { appId: packageInfo.appId, scope });

    await onLaunchInstalledApp({
      appId: packageInfo.appId,
      displayName: packageInfo.displayName,
      version: packageInfo.version,
      installStatus: "installed",
      installScope: scope,
      installedAt: "",
      destinationPath: preview?.destinationPath ?? "",
    });
  };

  const openInstallLogsDirectory = async () => {
    try {
      await openLogsDirectory();
      logUiAction("installer-open-logs-directory");
    } catch {
      logUiError("installer-open-logs-directory-failed");
      onToast("error", installerText("toast.openLogsFailed"));
    }
  };

  return {
    step,
    setStep,
    scope,
    setScope,
    progress,
    statusText,
    installLifecycleState,
    packageInfo,
    preview,
    isBusy,
    preflightBlockedMessage,
    installPreflight,
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
    packageOpenError,
    copyPackageOpenErrorDetails,
    installFailure,
    copyInstallFailureDetails,
    copyInstallPreflightDetails,
    openInstallLogsDirectory,
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
  };
};
