import { useEffect, useMemo, useState } from "preact/hooks";
import { InstallerPage } from "../installer/InstallerPage";
import {
  mockInstallOptions,
  mockPackageInfo,
  mockPreviewForScope,
} from "../../mocks/mockData";
import { appText } from "../../i18n/app";
import { installerText } from "../../i18n/installer";
import type { DebugInstallScenario } from "./DebugControlToolbar";
import type {
  InstallDecision,
  InstallOptionValue,
  InstallScope,
  WizardStep,
} from "../../types/app";

type MockInstallFlowPageProps = {
  scenario: DebugInstallScenario;
  existingVersion: string;
  incomingVersion: string;
  onOpenScreenshot: (gallery: string[], index: number) => void;
  onOpenLicense: (title: string, text: string) => void;
  onToast: (kind: "info" | "success" | "warning" | "error", message: string) => void;
  onExitToDebug: () => void;
  onBackToPreview: () => void;
  onViewInstalledDetails: (appId: string) => void;
};

const initialInstallOptions: Record<string, InstallOptionValue> = {
  channel: { type: "select", value: "stable" },
  desktopLauncher: { type: "checkbox", value: true },
  installDirName: { type: "text", value: "" },
};

export const MockInstallFlowPage = ({
  scenario,
  existingVersion,
  incomingVersion,
  onOpenScreenshot,
  onOpenLicense,
  onToast,
  onExitToDebug,
  onBackToPreview,
  onViewInstalledDetails,
}: MockInstallFlowPageProps) => {
  const [step, setStep] = useState<WizardStep>("trust");
  const [scope, setScope] = useState<InstallScope>("user");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showCompleteTechnicalDetails, setShowCompleteTechnicalDetails] = useState(false);
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [wipeOnReinstall, setWipeOnReinstall] = useState(false);
  const [confirmWipeOnReinstall, setConfirmWipeOnReinstall] = useState(false);
  const [allowDowngrade, setAllowDowngrade] = useState(false);
  const [installOptionValues, setInstallOptionValues] = useState<Record<string, InstallOptionValue>>(initialInstallOptions);
  const [installOptionError, setInstallOptionError] = useState("");
  const [validatingInstallOptions, setValidatingInstallOptions] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(installerText("mock.preparingInstall"));
  const [installLifecycleState, setInstallLifecycleState] = useState<"queued" | "downloading" | "validating" | "installing" | "verifying" | "success" | "failed">("queued");
  const [isBusy, setIsBusy] = useState(false);

  const managedExistingInstall = scenario !== "new_install";
  const scenarioPackageInfo = useMemo(() => ({
    ...mockPackageInfo,
    version: incomingVersion,
  }), [incomingVersion]);

  const installDecision: InstallDecision | null = useMemo(() => {
    if (scenario === "new_install") {
      return null;
    }

    if (scenario === "downgrade") {
      return {
        action: "downgrade",
        message: installerText("mock.decisionUpdate"),
        existingVersion,
        incomingVersion,
      };
    }

    if (scenario === "reinstall") {
      return {
        action: "reinstall",
        message: installerText("mock.decisionUpdate"),
        existingVersion: incomingVersion,
        incomingVersion,
      };
    }

    return {
      action: "update",
      message: installerText("mock.decisionUpdate"),
      existingVersion,
      incomingVersion,
    };
  }, [scenario, existingVersion, incomingVersion]);

  const mockWizardSteps: WizardStep[] = [
    "details",
    "trust",
    ...(scenarioPackageInfo.requiresLicenseAcceptance ? (["license"] as WizardStep[]) : []),
    "options",
    "scope",
    "decision",
    "progress",
    "complete",
  ];

  useEffect(() => {
    if (step !== "progress") {
      return;
    }

    setIsBusy(true);
    setProgress(0);
    setInstallLifecycleState("downloading");
    setStatusText(installerText("mock.downloading"));

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 14, 100);
        if (next >= 85) {
          setInstallLifecycleState("verifying");
          setStatusText(installerText("mock.verifying"));
        } else if (next >= 60) {
          setInstallLifecycleState("installing");
          setStatusText(installerText("mock.installing"));
        } else if (next >= 35) {
          setInstallLifecycleState("validating");
          setStatusText(installerText("mock.validating"));
        }

        if (next >= 100) {
          window.clearInterval(timer);
          setInstallLifecycleState("success");
          setStatusText(installerText("mock.complete"));
          setIsBusy(false);
          setStep("complete");
        }

        return next;
      });
    }, 340);

    return () => {
      window.clearInterval(timer);
    };
  }, [step]);

  return (
      <InstallerPage
        step={step}
        packageInfo={scenarioPackageInfo}
        installerWizardSteps={mockWizardSteps}
      checkingPreflight={false}
      preflightBlockedMessage=""
      installPreflight={null}
      showTechnicalDetails={showTechnicalDetails}
      showCompleteTechnicalDetails={showCompleteTechnicalDetails}
      licenseAccepted={licenseAccepted}
      scope={scope}
      statusText={statusText}
      installLifecycleState={installLifecycleState}
      progress={progress}
      isBusy={isBusy}
        preview={mockPreviewForScope(scope)}
      onChoosePackage={() => onToast("info", installerText("mock.packagePickerDisabled"))}
      onContinueFromDetails={() => setStep("trust")}
      onClearSelectedPackage={onExitToDebug}
      onOpenScreenshotModal={onOpenScreenshot}
      onOpenLicenseViewer={onOpenLicense}
      onToggleTechnicalDetails={() => setShowTechnicalDetails((prev) => !prev)}
      onSetStep={setStep}
      onGoBackFromTrustStep={onBackToPreview}
        onContinueFromTrustStep={() => setStep(scenarioPackageInfo.requiresLicenseAcceptance ? "license" : "options")}
      onGoBackFromLicenseStep={() => setStep("trust")}
      onContinueFromLicenseStep={() => setStep("options")}
      onGoBackFromOptionsStep={() => setStep(scenarioPackageInfo.requiresLicenseAcceptance ? "license" : "trust")}
      onContinueFromOptionsStep={() => {
        setValidatingInstallOptions(true);
        const channel = installOptionValues.channel;
        if (!channel || channel.type !== "select" || !channel.value) {
          setInstallOptionError(installerText("mock.releaseChannelRequired"));
          setValidatingInstallOptions(false);
          return;
        }
        setInstallOptionError("");
        setValidatingInstallOptions(false);
        setStep("scope");
      }}
      onGoBackFromScopeStep={() => setStep("options")}
      onContinueFromScopeStep={() => setStep("decision")}
      onGoBackFromDecisionStep={() => setStep("scope")}
      installOptions={mockInstallOptions}
      managedExistingInstall={managedExistingInstall}
      installDecision={installDecision}
      wipeOnReinstall={wipeOnReinstall}
      confirmWipeOnReinstall={confirmWipeOnReinstall}
      allowDowngrade={allowDowngrade}
      onSetReinstallWipeChoice={setWipeOnReinstall}
      onSetConfirmWipeOnReinstall={setConfirmWipeOnReinstall}
      onSetDowngradeAllowed={setAllowDowngrade}
      installOptionValues={installOptionValues}
      installOptionError={installOptionError}
      validatingInstallOptions={validatingInstallOptions}
      onSetInstallOptionValue={(id, value) => setInstallOptionValues((current) => ({ ...current, [id]: value }))}
      packageOpenError={null}
      onCopyPackageOpenErrorDetails={() => onToast("info", installerText("mock.copyPackageErrorDetails"))}
      installFailure={{
        summary: installerText("mock.installFailureSummary"),
        details: installerText("mock.installFailureDetails"),
        capturedAtIso8601: "2026-04-20T11:02:31.502+01:00",
        capturedAtDisplay: installerText("mock.installFailureTime"),
      }}
      onCopyInstallFailureDetails={() => onToast("info", installerText("mock.copyFailureDetails"))}
      onCopyInstallPreflightDetails={() => onToast("info", installerText("mock.copyCompatibilityReport"))}
      onOpenInstallLogsDirectory={() => onToast("info", installerText("mock.openLogs"))}
      onSetLicenseAccepted={setLicenseAccepted}
      onSetScope={setScope}
      onStartInstall={() => setStep("progress")}
      onCloseInstallComplete={onExitToDebug}
      onToggleCompleteTechnicalDetails={() => setShowCompleteTechnicalDetails((prev) => !prev)}
      onLaunchCurrentPackage={() => onToast("success", installerText("mock.launchComplete"))}
      onMetaFieldCopied={(label) => onToast("info", appText("toast.metaCopied", { label }))}
        onViewInstalledDetails={() => onViewInstalledDetails(scenarioPackageInfo.appId)}
      />
  );
};
