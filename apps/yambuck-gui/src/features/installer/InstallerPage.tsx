import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { MessagePanel } from "../../components/ui/MessagePanel";
import { MetaField } from "../../components/ui/MetaField";
import { PanelHeader } from "../../components/ui/PanelHeader";
import { inlineActions, licenseActions, licenseLabel, link } from "../../components/ui/metaField.css";
import { Panel } from "../../components/ui/Panel";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { ScopeChoiceCards } from "../../components/ui/ScopeChoiceCards";
import { SectionToggleButton } from "../../components/ui/SectionToggleButton";
import { TextField } from "../../components/ui/TextField";
import { WizardStepper } from "../../components/ui/WizardStepper";
import type { WizardStepperStep } from "../../components/ui/WizardStepper";
import { SelectField } from "../../components/ui/SelectField";
import type { SelectFieldOption } from "../../components/ui/SelectField";
import { MetaCardGrid } from "../shared/MetaCardGrid";
import { PackageDetailsSections } from "../shared/PackageDetailsSections";
import {
  actions,
  actionsStart,
  metaSection,
  metaSectionHeader,
  packagePanel,
  subtitle,
  technicalSection,
  technicalToggleOnly,
} from "../shared/packageUi.css";
import {
  installerActionRow,
  installerPanel,
  licenseActionRow,
  licenseRequirementNote,
  openPackageErrorBoxText,
  openPackageErrorPre,
  openPackageErrorSection,
  progressWrap,
  scopeChoicesWrap,
  scopeNotice,
} from "./installerPage.css";
import { appText } from "../../i18n/app";
import type {
  InstallOptionDefinition,
  InstallOptionValue,
  InstallPreflightResult,
  InstallDecision,
  InstallPreview,
  InstallScope,
  PackageInfo,
  WizardStep,
} from "../../types/app";
import { formatInstallScopeLabel } from "../../utils/scope";
import { displayOrFallback } from "../../utils/text";
import { installerDecisionMessage, installerText } from "../../i18n/installer";

const scopeChoices = [
  {
    value: "user",
    title: installerText("scope.user.title"),
    description: installerText("scope.user.description"),
  },
  {
    value: "system",
    title: installerText("scope.system.title"),
    description: installerText("scope.system.description"),
  },
];

const stepLabels: Record<WizardStep, string> = {
  details: installerText("step.details"),
  trust: installerText("step.trust"),
  license: installerText("step.license"),
  decision: installerText("step.decision"),
  options: installerText("step.options"),
  scope: installerText("step.scope"),
  progress: installerText("step.progress"),
  complete: installerText("step.complete"),
  failed: installerText("step.failed"),
};

const buildInstallerSteps = (
  wizardSteps: WizardStep[] | null,
  includeLicense: boolean,
  includeDecision: boolean,
): WizardStepperStep[] => {
  const defaultSteps: WizardStep[] = [
    "details",
    "trust",
    ...(includeLicense ? ["license" as const] : []),
    "options",
    "scope",
    "decision",
    "progress",
    "complete",
  ];

  const sourceSteps = wizardSteps && wizardSteps.length > 0 ? wizardSteps : defaultSteps;
  const normalizedSteps = [...sourceSteps];
  if (includeDecision && !normalizedSteps.includes("decision")) {
    const progressIndex = normalizedSteps.indexOf("progress");
    if (progressIndex >= 0) {
      normalizedSteps.splice(progressIndex, 0, "decision");
    } else {
      normalizedSteps.push("decision");
    }
  }

  return normalizedSteps
    .filter((step) => step !== "failed")
    .map((step) => ({ id: step, label: stepLabels[step] }));
};

type InstallerPageProps = {
  step: WizardStep;
  packageInfo: PackageInfo | null;
  installerWizardSteps: WizardStep[] | null;
  checkingPreflight: boolean;
  preflightBlockedMessage: string;
  installPreflight: InstallPreflightResult | null;
  showTechnicalDetails: boolean;
  showCompleteTechnicalDetails: boolean;
  licenseAccepted: boolean;
  scope: InstallScope;
  statusText: string;
  installLifecycleState: "queued" | "downloading" | "validating" | "installing" | "verifying" | "success" | "failed";
  progress: number;
  isBusy: boolean;
  preview: InstallPreview | null;
  onChoosePackage: () => void;
  onContinueFromDetails: () => void;
  onClearSelectedPackage: () => void;
  onOpenScreenshotModal: (gallery: string[], index: number) => void;
  onOpenLicenseViewer: (title: string, text: string) => void;
  onToggleTechnicalDetails: () => void;
  onSetStep: (step: WizardStep) => void;
  onGoBackFromTrustStep: () => void;
  onContinueFromTrustStep: () => void;
  onGoBackFromLicenseStep: () => void;
  onContinueFromLicenseStep: () => void;
  onGoBackFromOptionsStep: () => void;
  onContinueFromOptionsStep: () => void;
  onGoBackFromScopeStep: () => void;
  onScopePrimaryAction: () => void;
  onGoBackFromDecisionStep: () => void;
  installOptions: InstallOptionDefinition[];
  managedExistingInstall: boolean;
  installDecision: InstallDecision | null;
  wipeOnReinstall: boolean;
  confirmWipeOnReinstall: boolean;
  allowDowngrade: boolean;
  onSetReinstallWipeChoice: (value: boolean) => void;
  onSetConfirmWipeOnReinstall: (value: boolean) => void;
  onSetDowngradeAllowed: (value: boolean) => void;
  installOptionValues: Record<string, InstallOptionValue>;
  installOptionError: string;
  validatingInstallOptions: boolean;
  onSetInstallOptionValue: (id: string, value: InstallOptionValue) => void;
  packageOpenError: {
    packageFile: string;
    message: string;
    capturedAtIso8601: string;
    capturedAtDisplay: string;
  } | null;
  onCopyPackageOpenErrorDetails: () => void;
  installFailure: {
    summary: string;
    details: string;
    capturedAtIso8601: string;
    capturedAtDisplay: string;
  } | null;
  onCopyInstallFailureDetails: () => void;
  onCopyInstallPreflightDetails: () => void;
  onOpenInstallLogsDirectory: () => void;
  onSetLicenseAccepted: (value: boolean) => void;
  onSetScope: (scope: InstallScope) => void;
  onStartInstall: () => void;
  onCloseInstallComplete: () => void;
  onToggleCompleteTechnicalDetails: () => void;
  onLaunchCurrentPackage: () => void;
  onMetaFieldCopied: (label: string) => void;
  onViewInstalledDetails?: () => void;
};

export const InstallerPage = ({
  step,
  packageInfo,
  installerWizardSteps,
  checkingPreflight,
  preflightBlockedMessage,
  installPreflight,
  showTechnicalDetails,
  showCompleteTechnicalDetails,
  licenseAccepted,
  scope,
  statusText,
  installLifecycleState,
  progress,
  isBusy,
  preview,
  onChoosePackage,
  onContinueFromDetails,
  onClearSelectedPackage,
  onOpenScreenshotModal,
  onOpenLicenseViewer,
  onToggleTechnicalDetails,
  onSetStep,
  onGoBackFromTrustStep,
  onContinueFromTrustStep,
  onGoBackFromLicenseStep,
  onContinueFromLicenseStep,
  onGoBackFromOptionsStep,
  onContinueFromOptionsStep,
  onGoBackFromScopeStep,
  onScopePrimaryAction,
  onGoBackFromDecisionStep,
  installOptions,
  managedExistingInstall,
  installDecision,
  wipeOnReinstall,
  confirmWipeOnReinstall,
  allowDowngrade,
  onSetReinstallWipeChoice,
  onSetConfirmWipeOnReinstall,
  onSetDowngradeAllowed,
  installOptionValues,
  installOptionError,
  validatingInstallOptions,
  onSetInstallOptionValue,
  packageOpenError,
  onCopyPackageOpenErrorDetails,
  installFailure,
  onCopyInstallFailureDetails,
  onCopyInstallPreflightDetails,
  onOpenInstallLogsDirectory,
  onSetLicenseAccepted,
  onSetScope,
  onStartInstall,
  onCloseInstallComplete,
  onToggleCompleteTechnicalDetails,
  onLaunchCurrentPackage,
  onMetaFieldCopied,
  onViewInstalledDetails,
}: InstallerPageProps) => {
  const includeLicenseStep = packageInfo?.requiresLicenseAcceptance ?? false;
  const installerSteps = buildInstallerSteps(installerWizardSteps, includeLicenseStep, managedExistingInstall);
  const currentStepId = step === "failed" ? "progress" : step;

  const renderStepper = () => (
    <WizardStepper steps={installerSteps} currentStepId={currentStepId} align="center" />
  );

  if (step === "details") {
    const interfaceLabel = packageInfo
      ? packageInfo.appInterface.hasGui && packageInfo.appInterface.hasCli
        ? installerText("interface.guiCli")
        : packageInfo.appInterface.hasGui
          ? installerText("interface.gui")
          : installerText("interface.cli")
      : installerText("interface.unknown");
    const runtimeDependencyIssues = installPreflight?.runtimeDependencyIssues ?? [];
    const runtimeDependencyBlockers = runtimeDependencyIssues.filter((issue) => issue.severity === "block");
    const runtimeDependencyWarnings = runtimeDependencyIssues.filter((issue) => issue.severity === "warn");

    return (
      <Panel
        class={`package-panel ${packagePanel} ${installerPanel}`}
        showCornerClose={packageInfo !== null}
        cornerCloseTitle={installerText("ui.closePackage")}
        onCornerClose={onClearSelectedPackage}
      >
        {packageInfo || packageOpenError ? renderStepper() : null}
        {packageInfo ? (
          <>
            <PanelHeader
              variant="app"
              title={packageInfo.displayName}
              iconSrc={packageInfo.iconDataUrl!}
              iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
              actions={(
                <Button variant="primary" onClick={onContinueFromDetails} disabled={checkingPreflight}>
                  {checkingPreflight ? installerText("ui.checking") : installerText("ui.install")}
                </Button>
              )}
            >
              {installerText("ui.reviewSubtitle")}
            </PanelHeader>
            {preflightBlockedMessage ? (
              <MessagePanel tone="error" title={installerText("ui.installBlockedTitle")}>
                <p>{preflightBlockedMessage}</p>
                {runtimeDependencyBlockers.length > 0 ? (
                  <p>
                    Missing required host dependencies: {runtimeDependencyBlockers.length}
                  </p>
                ) : null}
                {installPreflight?.reasons.length ? (
                  <ul>
                    {installPreflight.reasons.map((reason) => (
                      <li key={`${reason.code}-${reason.message}`}>{reason.message}</li>
                    ))}
                  </ul>
                ) : null}
                {runtimeDependencyBlockers.length > 0 ? (
                  <ul>
                    {runtimeDependencyBlockers.map((issue) => (
                      <li key={`${issue.id}-${issue.reasonCode}`}>{issue.message}</li>
                    ))}
                  </ul>
                ) : null}
                <Button onClick={onCopyInstallPreflightDetails}>{installerText("ui.copyCompatibilityReport")}</Button>
              </MessagePanel>
            ) : null}

            {!preflightBlockedMessage && runtimeDependencyWarnings.length > 0 ? (
              <MessagePanel tone="warning" title="Dependency warnings">
                <p>
                  This app can continue, but {runtimeDependencyWarnings.length} host dependency warning(s) were detected.
                </p>
                <ul>
                  {runtimeDependencyWarnings.map((issue) => (
                    <li key={`${issue.id}-${issue.reasonCode}`}>{issue.message}</li>
                  ))}
                </ul>
              </MessagePanel>
            ) : null}

            {packageInfo.appInterface.hasCli && !packageInfo.appInterface.hasGui ? (
              <MessagePanel tone="warning" title={installerText("ui.terminalAppTitle")}>
                <p>{installerText("ui.terminalAppBody")}</p>
              </MessagePanel>
            ) : null}

            <PackageDetailsSections
              packageInfo={packageInfo}
              showTechnicalDetails={showTechnicalDetails}
              onToggleTechnicalDetails={onToggleTechnicalDetails}
              onOpenScreenshot={onOpenScreenshotModal}
              showOverviewIcon={false}
              appDetailsContent={(
                <>
                  <MetaField label={appText("meta.publisher.label")} tooltip={appText("meta.publisher.tooltip")} value={packageInfo.publisher} onCopySuccess={onMetaFieldCopied} />
                  <MetaField label={appText("meta.version.label")} tooltip={appText("meta.version.tooltip")} value={packageInfo.version} onCopySuccess={onMetaFieldCopied} />
                  <MetaField
                    label={installerText("ui.meta.interface.label")}
                    tooltip={installerText("ui.meta.interface.tooltip")}
                    value={<code>{interfaceLabel}</code>}
                    onCopySuccess={onMetaFieldCopied}
                  />
                  {packageInfo.homepageUrl ? (
                    <MetaField
                      label={appText("meta.homepageUrl.label")}
                      tooltip={installerText("ui.meta.homepage.tooltip")}
                      copyValue={packageInfo.homepageUrl}
                      onCopySuccess={onMetaFieldCopied}
                      value={
                        <a class={`meta-link ${link}`} href={packageInfo.homepageUrl} target="_blank" rel="noreferrer">
                          {packageInfo.homepageUrl}
                        </a>
                      }
                    />
                  ) : null}
                  {packageInfo.supportUrl ? (
                    <MetaField
                      label={appText("meta.supportUrl.label")}
                      tooltip={installerText("ui.meta.support.tooltip")}
                      copyValue={packageInfo.supportUrl}
                      onCopySuccess={onMetaFieldCopied}
                      value={
                        <a class={`meta-link ${link}`} href={packageInfo.supportUrl} target="_blank" rel="noreferrer">
                          {packageInfo.supportUrl}
                        </a>
                      }
                    />
                  ) : null}
                  {packageInfo.license ? (
                    <MetaField
                      label={appText("meta.license.label")}
                      tooltip={installerText("ui.meta.license.tooltip")}
                      onCopySuccess={onMetaFieldCopied}
                      value={(
                        <span class={`meta-inline-actions ${inlineActions} license-actions ${licenseActions}`}>
                          <span class={`license-action-label ${licenseLabel}`}>{packageInfo.license}</span>
                          {packageInfo.licenseText ? (
                              <Button
                                onClick={() => onOpenLicenseViewer(appText("review.licenseTitle", { appName: packageInfo.displayName }), packageInfo.licenseText!)}
                              >
                              {installerText("ui.viewLicense")}
                            </Button>
                          ) : null}
                        </span>
                      )}
                    />
                  ) : null}
                  {!packageInfo.license && packageInfo.licenseText ? (
                    <MetaField
                      label={appText("meta.license.label")}
                      tooltip={installerText("ui.meta.license.tooltip")}
                      onCopySuccess={onMetaFieldCopied}
                      value={(
                        <span class={`meta-inline-actions ${inlineActions} license-actions ${licenseActions}`}>
                          <Button
                            onClick={() => onOpenLicenseViewer(appText("review.licenseTitle", { appName: packageInfo.displayName }), packageInfo.licenseText!)}
                          >
                            {installerText("ui.viewLicense")}
                          </Button>
                        </span>
                      )}
                    />
                  ) : null}
                  <MetaField
                    label={appText("meta.trust.label")}
                    tooltip={installerText("ui.meta.trust.tooltip")}
                    value={packageInfo.trustStatus}
                    onCopySuccess={onMetaFieldCopied}
                  />
                </>
              )}
              technicalDetailsContent={(
                <>
                  <MetaField label={appText("meta.package.label")} tooltip={appText("meta.package.tooltip")} value={packageInfo.fileName} onCopySuccess={onMetaFieldCopied} />
                  <MetaField label={appText("meta.manifest.label")} tooltip={appText("meta.manifest.tooltip")} value={packageInfo.manifestVersion} onCopySuccess={onMetaFieldCopied} />
                  <MetaField label={appText("meta.appId.label")} tooltip={appText("meta.appId.tooltip")} value={packageInfo.appId} onCopySuccess={onMetaFieldCopied} />
                  <MetaField
                    label={installerText("ui.meta.entrypoint.label")}
                    tooltip={installerText("ui.meta.entrypoint.tooltip")}
                    copyValue={packageInfo.entrypoint}
                    onCopySuccess={onMetaFieldCopied}
                    value={<code>{packageInfo.entrypoint}</code>}
                  />
                  {packageInfo.cliCommandName ? (
                    <MetaField
                      label={installerText("ui.meta.cliCommand.label")}
                      tooltip={installerText("ui.meta.cliCommand.tooltip")}
                      copyValue={packageInfo.cliCommandName}
                      onCopySuccess={onMetaFieldCopied}
                      value={<code>{packageInfo.cliCommandName}</code>}
                    />
                  ) : null}
                  {packageInfo.cliUsageHint ? (
                    <MetaField
                      label={installerText("ui.meta.cliUsage.label")}
                      tooltip={installerText("ui.meta.cliUsage.tooltip")}
                      copyValue={packageInfo.cliUsageHint}
                      onCopySuccess={onMetaFieldCopied}
                      value={<code>{packageInfo.cliUsageHint}</code>}
                    />
                  ) : null}
                  {packageInfo.selectedTargetId ? (
                    <MetaField
                      label={installerText("ui.meta.target.label")}
                      tooltip={installerText("ui.meta.target.tooltip")}
                      value={packageInfo.selectedTargetId}
                      onCopySuccess={onMetaFieldCopied}
                    />
                  ) : null}
                  {packageInfo.payloadRoot ? (
                    <MetaField
                      label={installerText("ui.meta.payloadRoot.label")}
                      tooltip={installerText("ui.meta.payloadRoot.tooltip")}
                      copyValue={packageInfo.payloadRoot}
                      onCopySuccess={onMetaFieldCopied}
                      value={<code>{packageInfo.payloadRoot}</code>}
                    />
                  ) : null}
                  <MetaField label={appText("meta.appUuid.label")} tooltip={appText("meta.appUuid.tooltip")} value={packageInfo.appUuid} onCopySuccess={onMetaFieldCopied} />
                  <MetaField label={appText("meta.packageUuid.label")} tooltip={appText("meta.packageUuid.tooltip")} value={packageInfo.packageUuid} onCopySuccess={onMetaFieldCopied} />
                </>
              )}
            />
          </>
        ) : packageOpenError ? (
          <>
            <PanelHeader title={installerText("ui.openPackageTitle")}>
              <>
                {installerText("ui.openPackageSubtitlePrimary")}
                <br />
                {installerText("ui.openPackageSubtitleSecondary")}
              </>
            </PanelHeader>
            <section class={`meta-section technical open-package-error-section ${openPackageErrorSection}`}>
              <div class={`meta-section-header ${metaSectionHeader}`}>
                <h2>{installerText("ui.errorDetailsHeading")}</h2>
              </div>
              <MessagePanel tone="error" class="open-package-error-box">
                <p class={openPackageErrorBoxText}>
                  <strong>{installerText("ui.errorPackageLabel")}:</strong> <code>{packageOpenError.packageFile}</code>
                </p>
                <p class={openPackageErrorBoxText}>
                  <strong>{installerText("ui.errorTimeLabel")}:</strong> <code>{packageOpenError.capturedAtDisplay}</code>
                </p>
                <pre class={`open-package-error-pre ${openPackageErrorPre}`}><code>{installerText("ui.errorMessageLabel")}: {packageOpenError.message}</code></pre>
              </MessagePanel>
            </section>
            <div class={`actions ${actions} ${installerActionRow}`}>
              <Button onClick={onClearSelectedPackage}>{installerText("ui.close")}</Button>
              <Button variant="primary" onClick={onCopyPackageOpenErrorDetails}>{installerText("ui.copyDetails")}</Button>
            </div>
          </>
        ) : (
          <>
            <PanelHeader title={installerText("ui.choosePackageTitle")}>
              {installerText("ui.choosePackageSubtitle")}
            </PanelHeader>
            <div class={`actions start ${actions} ${actionsStart} ${installerActionRow}`}>
              <Button variant="primary" onClick={onChoosePackage}>
                {installerText("ui.openPackageButton")}
              </Button>
            </div>
          </>
        )}
      </Panel>
    );
  }

  if (!packageInfo) {
    return null;
  }

  if (step === "trust") {
    const isVerified = packageInfo.trustStatus === "verified";
    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <PanelHeader
          variant="app"
          title={installerText("ui.trustTitle")}
          iconSrc={packageInfo.iconDataUrl!}
          iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
        >
          {installerText("ui.trustSubtitle")}
        </PanelHeader>
        <MessagePanel
          tone={isVerified ? "success" : "warning"}
          title={isVerified ? installerText("ui.verifiedPublisherTitle") : installerText("ui.unverifiedPublisherTitle")}
        >
          <p>{isVerified ? installerText("ui.verifiedPublisherBody") : installerText("ui.unverifiedPublisherBody")}</p>
        </MessagePanel>
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={onGoBackFromTrustStep}>{installerText("ui.back")}</Button>
          <Button variant="primary" onClick={onContinueFromTrustStep}>
            {isVerified ? installerText("ui.next") : installerText("ui.installAnyway")}
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "license") {
    const licenseText = packageInfo.licenseText?.trim() ?? "";
    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <PanelHeader
          variant="app"
          title={installerText("ui.licenseTitle")}
          iconSrc={packageInfo.iconDataUrl!}
          iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
        >
          {installerText("ui.licenseSubtitle")}
        </PanelHeader>
        <div class={`actions start ${actions} ${actionsStart} ${licenseActionRow}`}>
          {licenseText ? (
            <Button onClick={() => onOpenLicenseViewer(appText("review.licenseTitle", { appName: packageInfo.displayName }), licenseText)}>
              {installerText("ui.viewLicense")}
            </Button>
          ) : (
            <p class={`subtitle ${subtitle}`}>{installerText("ui.licenseMissingBody")}</p>
          )}
        </div>
        <CheckboxField checked={licenseAccepted} disabled={!licenseText} onChange={onSetLicenseAccepted} class="license-acceptance">
          {installerText("ui.licenseAcceptedLabel")}
        </CheckboxField>
        {!licenseAccepted ? (
          <p class={licenseRequirementNote}>{installerText("ui.licenseRequiredBody")}</p>
        ) : null}
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={onGoBackFromLicenseStep}>{installerText("ui.back")}</Button>
          <Button variant="primary" onClick={onContinueFromLicenseStep} disabled={!licenseText || !licenseAccepted}>
            {installerText("ui.continue")}
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "scope") {
    const scopeTitle = !managedExistingInstall
      ? installerText("ui.installScopeTitle")
      : installDecision?.action === "update"
        ? installerText("ui.updateScopeTitle")
        : installDecision?.action === "downgrade"
          ? installerText("ui.downgradeScopeTitle")
          : installerText("ui.reinstallScopeTitle");

    const scopeSubtitle = !managedExistingInstall
      ? installerText("ui.installScopeSubtitle")
      : installDecision?.action === "update"
        ? installerText("ui.updateScopeSubtitle")
        : installDecision?.action === "downgrade"
          ? installerText("ui.downgradeScopeSubtitle")
          : installerText("ui.reinstallScopeSubtitle");

    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <PanelHeader
          variant="app"
          title={scopeTitle}
          iconSrc={packageInfo.iconDataUrl!}
          iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
        >
          {scopeSubtitle}
        </PanelHeader>
        <ScopeChoiceCards
          value={scope}
          options={scopeChoices}
          onValueChange={(nextValue) => onSetScope(nextValue as InstallScope)}
          name="scope"
          ariaLabel={installerText("ui.installScopeAria")}
          class={scopeChoicesWrap}
        />
        {installDecision?.otherScope && installDecision.otherScopeExistingVersion ? (
          <MessagePanel tone="info" title={installerText("ui.otherScopeTitle")} class={scopeNotice}>
            <p>
              {installerText("ui.otherScopeBody", {
                version: installDecision.otherScopeExistingVersion,
                scope: formatInstallScopeLabel(installDecision.otherScope),
              })}
            </p>
          </MessagePanel>
        ) : null}
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={onGoBackFromScopeStep}>{installerText("ui.back")}</Button>
          <Button variant="primary" onClick={onScopePrimaryAction}>
            {managedExistingInstall ? installerText("ui.continue") : installerText("ui.install")}
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "decision") {
    const scopeOptionsTitle = installDecision?.action === "update"
      ? installerText("ui.updateOptionsTitle")
      : installDecision?.action === "downgrade"
        ? installerText("ui.downgradeOptionsTitle")
        : installerText("ui.reinstallOptionsTitle");

    const canProceed = !((installDecision?.action === "downgrade" && !allowDowngrade)
      || (wipeOnReinstall && !confirmWipeOnReinstall));

    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <PanelHeader
          variant="app"
          title={scopeOptionsTitle}
          iconSrc={packageInfo.iconDataUrl!}
          iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
        >
          {installerText("ui.scopeDecisionSubtitle")}
        </PanelHeader>

        {installDecision ? (
          <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
            <MessagePanel
              tone={installDecision.action === "downgrade" ? "warning" : "info"}
            >
              <p>{installerDecisionMessage(installDecision)}</p>
            </MessagePanel>
            {installDecision?.action === "downgrade" ? (
              <CheckboxField checked={allowDowngrade} onChange={onSetDowngradeAllowed} class="license-acceptance">
                {installerText("ui.confirmDowngrade", {
                  existingVersion: installDecision.existingVersion ?? "current",
                  incomingVersion: installDecision.incomingVersion,
                })}
              </CheckboxField>
            ) : null}
            <CheckboxField checked={wipeOnReinstall} onChange={onSetReinstallWipeChoice} class="license-acceptance">
              {installerText("ui.removeExistingData")}
            </CheckboxField>
            {wipeOnReinstall ? (
              <CheckboxField checked={confirmWipeOnReinstall} onChange={onSetConfirmWipeOnReinstall} class="license-acceptance">
                {installerText("ui.confirmDeleteData")}
              </CheckboxField>
            ) : null}
          </section>
        ) : null}
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={onGoBackFromDecisionStep}>{installerText("ui.back")}</Button>
          <Button
            variant="primary"
            onClick={onStartInstall}
            disabled={!canProceed}
          >
            {installDecision?.action === "update"
              ? installerText("ui.action.update")
              : installDecision?.action === "downgrade"
                ? installerText("ui.action.downgrade")
              : managedExistingInstall
                ? installerText("ui.action.reinstall")
                : installerText("ui.install")}
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "options") {
    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <PanelHeader
          variant="app"
          title={installerText("ui.optionsTitle")}
          iconSrc={packageInfo.iconDataUrl!}
          iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
        >
          {installerText("ui.optionsSubtitle")}
        </PanelHeader>
        {installOptions.length === 0 ? (
          <MessagePanel tone="info" title={installerText("ui.noOptionsTitle")}>
            <p>{installerText("ui.noOptionsBody")}</p>
          </MessagePanel>
        ) : (
          <MetaCardGrid>
            {installOptions.map((option) => {
              const current = installOptionValues[option.id];
              const selectedValue = current?.type === "select" ? current.value : "";
              const checkboxValue = current?.type === "checkbox" ? current.value : false;
              const textValue = current?.type === "text" ? current.value : "";

              return (
                <div key={option.id}>
                  <dt>{option.label}</dt>
                  <dd>
                    {option.description ? <small>{option.description}</small> : null}
                    {option.inputType === "select" ? (
                      (() => {
                        const selectOptions: SelectFieldOption[] = [
                          ...(option.required ? [] : [{ value: "", label: installerText("ui.noSelection") }]),
                          ...option.choices.map((choice) => ({ value: choice.value, label: choice.label })),
                        ];

                        return (
                      <SelectField
                        value={selectedValue}
                        onValueChange={(nextValue) =>
                          onSetInstallOptionValue(option.id, {
                            type: "select",
                            value: nextValue,
                          })
                        }
                        options={selectOptions}
                        class="meta-select-field"
                      />
                        );
                      })()
                    ) : null}
                    {option.inputType === "checkbox" ? (
                      <CheckboxField
                        checked={checkboxValue}
                        onChange={(value) =>
                          onSetInstallOptionValue(option.id, {
                            type: "checkbox",
                            value,
                          })
                        }
                        class="license-acceptance"
                      >
                        {installerText("ui.enabled")}
                      </CheckboxField>
                    ) : null}
                    {option.inputType === "text" ? (
                      <TextField
                        value={textValue}
                        onInput={(value) =>
                          onSetInstallOptionValue(option.id, {
                            type: "text",
                            value,
                          })
                        }
                        placeholder={option.required ? installerText("ui.required") : installerText("ui.optional")}
                      />
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </MetaCardGrid>
        )}
        {installOptionError ? (
          <MessagePanel tone="error" title={installerText("ui.invalidOptionsTitle")}>
            <p>{installerText("ui.invalidOptionsBody")}</p>
          </MessagePanel>
        ) : null}
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={onGoBackFromOptionsStep}>{installerText("ui.back")}</Button>
          <Button variant="primary" onClick={onContinueFromOptionsStep} disabled={validatingInstallOptions}>
            {validatingInstallOptions ? installerText("ui.validating") : installerText("ui.continue")}
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "progress") {
    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <PanelHeader
          variant="app"
          title={installerText("ui.installingTitle", { appName: packageInfo.displayName })}
          iconSrc={packageInfo.iconDataUrl!}
          iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
        >
          <>
            {statusText}
            <br />
            {installerText("ui.installingStateLine")}
          </>
        </PanelHeader>
        <ProgressBar
          value={progress}
          class={progressWrap}
          ariaLabel={installerText("ui.installProgressAria", { state: installLifecycleState })}
        />
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button disabled={isBusy}>{installerText("ui.cancel")}</Button>
        </div>
      </Panel>
    );
  }

  if (step === "failed") {
    return (
      <Panel class={`package-panel ${packagePanel} ${installerPanel}`}>
        {renderStepper()}
        <PanelHeader
          variant="app"
          title={installerText("ui.installFailedTitle")}
          iconSrc={packageInfo.iconDataUrl!}
          iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
        >
          <>
            {installerText("ui.installFailedSubtitle")}
            <br />
            {installerText("ui.installFailedDetailsSubtitle")}
          </>
        </PanelHeader>

        {installFailure ? (
          <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
            <div class={`meta-section-header ${metaSectionHeader}`}>
              <h2>{installerText("ui.failureDetailsHeading")}</h2>
            </div>
            <MessagePanel tone="error" class="open-package-error-box">
              <p class={openPackageErrorBoxText}>
                <strong>{installerText("ui.errorTimeLabel")}:</strong> <code>{installFailure.capturedAtDisplay}</code>
              </p>
              <pre class={`open-package-error-pre ${openPackageErrorPre}`}><code>{installFailure.details}</code></pre>
            </MessagePanel>
          </section>
        ) : null}

        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={() => onSetStep("scope")}>{installerText("ui.retry")}</Button>
          <Button onClick={onCopyInstallFailureDetails} disabled={!installFailure}>{installerText("ui.copyDetails")}</Button>
          <Button onClick={onOpenInstallLogsDirectory}>{installerText("ui.openLogs")}</Button>
          <Button variant="primary" onClick={onClearSelectedPackage}>{installerText("ui.close")}</Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      class={`package-panel ${packagePanel} ${installerPanel}`}
      showCornerClose
      cornerCloseTitle={installerText("ui.backToInstalled")}
      onCornerClose={onCloseInstallComplete}
    >
      {renderStepper()}
      <PanelHeader
        variant="app"
        title={installerText("ui.installCompleteTitle")}
        iconSrc={packageInfo.iconDataUrl!}
        iconAlt={appText("package.iconAlt", { appName: packageInfo.displayName })}
      >
        {installerText("ui.installCompleteSubtitle", { appName: packageInfo.displayName })}
      </PanelHeader>

      {preview ? (
        <MetaCardGrid compact>
          <div>
            <dt>{installerText("ui.preview.scope")}</dt>
            <dd>{formatInstallScopeLabel(preview.installScope)}</dd>
          </div>
          <div>
            <dt>{installerText("ui.preview.destination")}</dt>
            <dd>{preview.destinationPath}</dd>
          </div>
          <div>
            <dt>{installerText("ui.preview.trust")}</dt>
            <dd>{preview.trustStatus}</dd>
          </div>
          <div>
            <dt>{installerText("ui.preview.package")}</dt>
            <dd>{preview.packageFile}</dd>
          </div>
        </MetaCardGrid>
      ) : null}

      {preview ? (
        <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
          <div class={`meta-section-header technical-toggle-only ${metaSectionHeader} ${technicalToggleOnly}`}>
            <SectionToggleButton
              expanded={showCompleteTechnicalDetails}
              onToggle={onToggleCompleteTechnicalDetails}
              showLabel={appText("package.technical.show")}
              hideLabel={appText("package.technical.hide")}
              controlsId="install-complete-technical-details"
            />
          </div>

          {showCompleteTechnicalDetails ? (
            <MetaCardGrid compact id="install-complete-technical-details">
              <MetaField
                label={installerText("ui.meta.launchPath.label")}
                tooltip={installerText("ui.meta.launchPath.tooltip")}
                copyValue={`${preview.destinationPath}/${packageInfo.entrypoint}`}
                onCopySuccess={onMetaFieldCopied}
                value={<code>{`${preview.destinationPath}/${packageInfo.entrypoint}`}</code>}
              />
              <MetaField
                label={installerText("ui.meta.entrypoint.label")}
                tooltip={installerText("ui.meta.entrypointComplete.tooltip")}
                copyValue={packageInfo.entrypoint}
                onCopySuccess={onMetaFieldCopied}
                value={<code>{packageInfo.entrypoint}</code>}
              />
              <MetaField label={appText("meta.manifest.label")} tooltip={installerText("ui.meta.manifest.tooltip")} value={packageInfo.manifestVersion} onCopySuccess={onMetaFieldCopied} />
              <MetaField label={appText("meta.appId.label")} tooltip={installerText("ui.meta.appId.tooltip")} value={packageInfo.appId} onCopySuccess={onMetaFieldCopied} />
              <MetaField label={appText("meta.appUuid.label")} tooltip={installerText("ui.meta.appUuid.tooltip")} value={packageInfo.appUuid} onCopySuccess={onMetaFieldCopied} />
              <MetaField label={appText("meta.packageUuid.label")} tooltip={installerText("ui.meta.packageUuid.tooltip")} value={packageInfo.packageUuid} onCopySuccess={onMetaFieldCopied} />
              <MetaField label={installerText("ui.meta.configPath.label")} tooltip={installerText("ui.meta.configPath.tooltip")} value={displayOrFallback(packageInfo.configPath)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label={installerText("ui.meta.cachePath.label")} tooltip={installerText("ui.meta.cachePath.tooltip")} value={displayOrFallback(packageInfo.cachePath)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label={installerText("ui.meta.tempPath.label")} tooltip={installerText("ui.meta.tempPath.tooltip")} value={displayOrFallback(packageInfo.tempPath)} onCopySuccess={onMetaFieldCopied} />
            </MetaCardGrid>
          ) : null}
        </section>
      ) : null}

      <div class={`actions ${actions} ${installerActionRow}`}>
        <Button onClick={onCloseInstallComplete}>{installerText("ui.close")}</Button>
        {onViewInstalledDetails ? <Button onClick={onViewInstalledDetails}>{installerText("ui.showInstalledDetails")}</Button> : null}
        <Button variant="primary" onClick={onLaunchCurrentPackage}>{installerText("ui.launchApp")}</Button>
      </div>
    </Panel>
  );
};
