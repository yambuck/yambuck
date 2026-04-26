import { useEffect, useMemo, useState } from "preact/hooks";
import { InstallerPage } from "../installer/InstallerPage";
import {
  mockInstallOptions,
  mockPackageInfo,
  mockPreviewForScope,
} from "../../mocks/mockData";
import { installerText } from "../../i18n/installer";
import type {
  InstallDecision,
  InstallOptionValue,
  InstallScope,
  WizardStep,
} from "../../types/app";

type MockInstallFlowPageProps = {
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

  const installDecision: InstallDecision | null = useMemo(() => ({
    action: "update",
    message: installerText("mock.decisionUpdate"),
    existingVersion: "1.3.8",
    incomingVersion: mockPackageInfo.version,
  }), [mockPackageInfo.version]);

  const mockWizardSteps: WizardStep[] = [
    "details",
    "trust",
    ...(mockPackageInfo.requiresLicenseAcceptance ? (["license"] as WizardStep[]) : []),
    "options",
    "scope",
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
      packageInfo={mockPackageInfo}
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
      onContinueFromTrustStep={() => setStep(mockPackageInfo.requiresLicenseAcceptance ? "license" : "options")}
      onGoBackFromLicenseStep={() => setStep("trust")}
      onContinueFromLicenseStep={() => setStep("options")}
      onGoBackFromOptionsStep={() => setStep(mockPackageInfo.requiresLicenseAcceptance ? "license" : "trust")}
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
      installOptions={mockInstallOptions}
      managedExistingInstall
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
        summary: "Mock install failed at validation stage.",
        details: "This is mock-only failure output for UI verification.",
        capturedAtIso8601: "2026-04-20T11:02:31.502+01:00",
        capturedAtDisplay: "Apr 20, 2026, 11:02:31 (+01:00)",
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
      onMetaFieldCopied={(label) => onToast("info", `${label} copied to clipboard.`)}
      onViewInstalledDetails={() => onViewInstalledDetails(mockPackageInfo.appId)}
    />
  );
};
