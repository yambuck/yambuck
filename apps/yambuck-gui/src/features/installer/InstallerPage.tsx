import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { MessagePanel } from "../../components/ui/MessagePanel";
import { MetaField } from "../../components/ui/MetaField";
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
  detailsActions,
  detailsHeader,
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
  licenseRequirementNote,
  openPackageErrorBoxText,
  openPackageErrorPre,
  openPackageErrorSection,
  progressWrap,
  scopeChoicesWrap,
  scopeNotice,
} from "./installerPage.css";
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
import { installerDecisionMessage, installerDecisionTitle, installerText } from "../../i18n/installer";

const scopeChoices = [
  {
    value: "user",
    title: "Just for me",
    description: "Recommended. No admin prompt needed.",
  },
  {
    value: "system",
    title: "All users",
    description: "May require admin permissions.",
  },
];

const stepLabels: Record<WizardStep, string> = {
  details: "Review",
  trust: "Trust",
  license: "License",
  options: "Options",
  scope: "Scope",
  progress: "Install",
  complete: "Done",
  failed: "Install",
};

const buildInstallerSteps = (wizardSteps: WizardStep[] | null, includeLicense: boolean): WizardStepperStep[] => {
  const defaultSteps: WizardStep[] = [
    "details",
    "trust",
    ...(includeLicense ? ["license" as const] : []),
    "options",
    "scope",
    "progress",
    "complete",
  ];

  const sourceSteps = wizardSteps && wizardSteps.length > 0 ? wizardSteps : defaultSteps;
  return sourceSteps
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
  const installerSteps = buildInstallerSteps(installerWizardSteps, includeLicenseStep);
  const currentStepId = step === "failed" ? "progress" : step;

  const renderStepper = () => (
    <WizardStepper steps={installerSteps} currentStepId={currentStepId} align="center" />
  );

  if (step === "details") {
    const interfaceLabel = packageInfo
      ? packageInfo.appInterface.hasGui && packageInfo.appInterface.hasCli
        ? "GUI + CLI"
        : packageInfo.appInterface.hasGui
          ? "GUI"
          : "CLI"
      : "Unknown";

    return (
      <Panel
        class={`package-panel ${packagePanel} ${installerPanel}`}
        showCornerClose={packageInfo !== null}
        cornerCloseTitle="Close package"
        onCornerClose={onClearSelectedPackage}
      >
        {packageInfo || packageOpenError ? renderStepper() : null}
        {packageInfo ? (
          <>
            <div class={`details-header ${detailsHeader}`}>
              <div>
                <h1>{packageInfo.displayName}</h1>
                <p class={`subtitle ${subtitle}`}>{installerText("ui.reviewSubtitle")}</p>
              </div>
              <div class={`details-actions ${detailsActions}`} data-no-drag="true">
                <Button variant="primary" onClick={onContinueFromDetails} disabled={checkingPreflight}>
                  {checkingPreflight ? "Checking..." : "Install"}
                </Button>
              </div>
            </div>
            {preflightBlockedMessage ? (
              <MessagePanel tone="error" title={installerText("ui.installBlockedTitle")}>
                <p>{preflightBlockedMessage}</p>
                {installPreflight?.reasons.length ? (
                  <ul>
                    {installPreflight.reasons.map((reason) => (
                      <li key={`${reason.code}-${reason.message}`}>{reason.message}</li>
                    ))}
                  </ul>
                ) : null}
                <Button onClick={onCopyInstallPreflightDetails}>Copy compatibility report</Button>
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
              appDetailsContent={(
                <>
                  <MetaField label="Publisher" tooltip="The team or company that published this app." value={packageInfo.publisher} onCopySuccess={onMetaFieldCopied} />
                  <MetaField label="Version" tooltip="The app version that will be installed." value={packageInfo.version} onCopySuccess={onMetaFieldCopied} />
                  <MetaField
                    label="Interface"
                    tooltip="How this app is intended to be used on your system."
                    value={<code>{interfaceLabel}</code>}
                    onCopySuccess={onMetaFieldCopied}
                  />
                  {packageInfo.homepageUrl ? (
                    <MetaField
                      label="Homepage"
                      tooltip="The app's official website for product information."
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
                      label="Support"
                      tooltip="Where to get help, report bugs, or contact maintainers."
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
                      label="License"
                      tooltip="The legal terms for using this app."
                      onCopySuccess={onMetaFieldCopied}
                      value={(
                        <span class={`meta-inline-actions ${inlineActions} license-actions ${licenseActions}`}>
                          <span class={`license-action-label ${licenseLabel}`}>{packageInfo.license}</span>
                          {packageInfo.licenseText ? (
                            <Button
                              onClick={() => onOpenLicenseViewer(`${packageInfo.displayName} License`, packageInfo.licenseText!)}
                            >
                              View license
                            </Button>
                          ) : null}
                        </span>
                      )}
                    />
                  ) : null}
                  {!packageInfo.license && packageInfo.licenseText ? (
                    <MetaField
                      label="License"
                      tooltip="The legal terms for using this app."
                      onCopySuccess={onMetaFieldCopied}
                      value={(
                        <span class={`meta-inline-actions ${inlineActions} license-actions ${licenseActions}`}>
                          <Button
                            onClick={() => onOpenLicenseViewer(`${packageInfo.displayName} License`, packageInfo.licenseText!)}
                          >
                            View license
                          </Button>
                        </span>
                      )}
                    />
                  ) : null}
                  <MetaField
                    label="Trust"
                    tooltip="Whether Yambuck could verify the package publisher signature."
                    value={packageInfo.trustStatus}
                    onCopySuccess={onMetaFieldCopied}
                  />
                </>
              )}
              technicalDetailsContent={(
                <>
                  <MetaField label="Package" tooltip="The package file name selected for this install." value={packageInfo.fileName} onCopySuccess={onMetaFieldCopied} />
                  <MetaField label="Manifest" tooltip="The manifest schema version this package was built with." value={packageInfo.manifestVersion} onCopySuccess={onMetaFieldCopied} />
                  <MetaField label="App ID" tooltip="A stable identifier Yambuck uses for updates and app tracking." value={packageInfo.appId} onCopySuccess={onMetaFieldCopied} />
                  <MetaField
                    label="Entrypoint"
                    tooltip="The internal command Yambuck uses to launch the installed app."
                    copyValue={packageInfo.entrypoint}
                    onCopySuccess={onMetaFieldCopied}
                    value={<code>{packageInfo.entrypoint}</code>}
                  />
                  {packageInfo.cliCommandName ? (
                    <MetaField
                      label="CLI command"
                      tooltip="Command to run in Terminal for this package's CLI mode."
                      copyValue={packageInfo.cliCommandName}
                      onCopySuccess={onMetaFieldCopied}
                      value={<code>{packageInfo.cliCommandName}</code>}
                    />
                  ) : null}
                  {packageInfo.cliUsageHint ? (
                    <MetaField
                      label="CLI usage"
                      tooltip="Developer-provided hint for using this package in Terminal."
                      copyValue={packageInfo.cliUsageHint}
                      onCopySuccess={onMetaFieldCopied}
                      value={<code>{packageInfo.cliUsageHint}</code>}
                    />
                  ) : null}
                  {packageInfo.selectedTargetId ? (
                    <MetaField
                      label="Target"
                      tooltip="Resolved package target selected for this system."
                      value={packageInfo.selectedTargetId}
                      onCopySuccess={onMetaFieldCopied}
                    />
                  ) : null}
                  {packageInfo.payloadRoot ? (
                    <MetaField
                      label="Payload root"
                      tooltip="Package folder selected for host payload extraction."
                      copyValue={packageInfo.payloadRoot}
                      onCopySuccess={onMetaFieldCopied}
                      value={<code>{packageInfo.payloadRoot}</code>}
                    />
                  ) : null}
                  <MetaField label="App UUID" tooltip="The immutable app identity UUID declared by the publisher." value={packageInfo.appUuid} onCopySuccess={onMetaFieldCopied} />
                  <MetaField label="Package UUID" tooltip="The unique UUID assigned to this specific package build." value={packageInfo.packageUuid} onCopySuccess={onMetaFieldCopied} />
                </>
              )}
            />
          </>
        ) : packageOpenError ? (
          <>
            <h1>{installerText("ui.openPackageTitle")}</h1>
            <p class={`subtitle ${subtitle}`}>{installerText("ui.openPackageSubtitlePrimary")}</p>
            <p class={`subtitle ${subtitle}`}>{installerText("ui.openPackageSubtitleSecondary")}</p>
            <section class={`meta-section technical open-package-error-section ${openPackageErrorSection}`}>
              <div class={`meta-section-header ${metaSectionHeader}`}>
                <h2>{installerText("ui.errorDetailsHeading")}</h2>
              </div>
              <MessagePanel tone="error" class="open-package-error-box">
                <p class={openPackageErrorBoxText}>
                  <strong>Package:</strong> <code>{packageOpenError.packageFile}</code>
                </p>
                <p class={openPackageErrorBoxText}>
                  <strong>Time:</strong> <code>{packageOpenError.capturedAtDisplay}</code>
                </p>
                <pre class={`open-package-error-pre ${openPackageErrorPre}`}><code>Error: {packageOpenError.message}</code></pre>
              </MessagePanel>
            </section>
            <div class={`actions ${actions} ${installerActionRow}`}>
              <Button onClick={onClearSelectedPackage}>Close</Button>
              <Button variant="primary" onClick={onCopyPackageOpenErrorDetails}>Copy details</Button>
            </div>
          </>
        ) : (
          <>
            <h1>{installerText("ui.choosePackageTitle")}</h1>
            <p class={`subtitle ${subtitle}`}>{installerText("ui.choosePackageSubtitle")}</p>
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
        <h1>{installerText("ui.trustTitle")}</h1>
        <MessagePanel
          tone={isVerified ? "success" : "warning"}
          title={isVerified ? installerText("ui.verifiedPublisherTitle") : installerText("ui.unverifiedPublisherTitle")}
        >
          <p>{isVerified ? installerText("ui.verifiedPublisherBody") : installerText("ui.unverifiedPublisherBody")}</p>
        </MessagePanel>
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={onGoBackFromTrustStep}>Back</Button>
          <Button variant="primary" onClick={onContinueFromTrustStep}>
            {isVerified ? "Next" : "Install anyway"}
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
        <h1>{installerText("ui.licenseTitle")}</h1>
        <p class={`subtitle ${subtitle}`}>{installerText("ui.licenseSubtitle")}</p>
        <div class={`actions start ${actions} ${actionsStart}`}>
          {licenseText ? (
            <Button onClick={() => onOpenLicenseViewer(`${packageInfo.displayName} License`, licenseText)}>
              View license
            </Button>
          ) : (
            <p class={`subtitle ${subtitle}`}>{installerText("ui.licenseMissingBody")}</p>
          )}
        </div>
        <CheckboxField checked={licenseAccepted} disabled={!licenseText} onChange={onSetLicenseAccepted} class="license-acceptance">
          I have read and accept this package license.
        </CheckboxField>
        {!licenseAccepted ? (
          <p class={licenseRequirementNote}>The publisher requires license acceptance before install can continue.</p>
        ) : null}
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={onGoBackFromLicenseStep}>Back</Button>
          <Button variant="primary" onClick={onContinueFromLicenseStep} disabled={!licenseText || !licenseAccepted}>
            Continue
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "scope") {
    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <h1>{managedExistingInstall ? installerText("ui.reinstallScopeTitle") : installerText("ui.installScopeTitle")}</h1>
        <p class={`subtitle ${subtitle}`}>
          {managedExistingInstall
            ? installerText("ui.reinstallScopeSubtitle")
            : installerText("ui.installScopeSubtitle")}
        </p>
        <ScopeChoiceCards
          value={scope}
          options={scopeChoices}
          onValueChange={(nextValue) => onSetScope(nextValue as InstallScope)}
          name="scope"
          ariaLabel="Install scope"
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
        {managedExistingInstall ? (
          <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
            <div class={`meta-section-header ${metaSectionHeader}`}>
              <h2>{installerText("ui.reinstallOptionsTitle")}</h2>
            </div>
            {installDecision ? (
              <MessagePanel
                tone={installDecision.action === "downgrade" ? "warning" : "info"}
                title={installerDecisionTitle(installDecision)}
              >
                <p>{installerDecisionMessage(installDecision)}</p>
                {installDecision.existingVersion ? (
                  <p>
                    Installed: <code>{installDecision.existingVersion}</code> {"->"} Package: <code>{installDecision.incomingVersion}</code>
                  </p>
                ) : null}
              </MessagePanel>
            ) : null}
            {installDecision?.action === "downgrade" ? (
              <CheckboxField checked={allowDowngrade} onChange={onSetDowngradeAllowed} class="license-acceptance">
                I understand this installs an older version and I want to continue.
              </CheckboxField>
            ) : null}
            <CheckboxField checked={wipeOnReinstall} onChange={onSetReinstallWipeChoice} class="license-acceptance">
              Remove existing app settings, cache, and temp data before reinstall.
            </CheckboxField>
            {wipeOnReinstall ? (
              <CheckboxField checked={confirmWipeOnReinstall} onChange={onSetConfirmWipeOnReinstall} class="license-acceptance">
                I understand this permanently deletes existing app data.
              </CheckboxField>
            ) : null}
          </section>
        ) : null}
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={onGoBackFromScopeStep}>Back</Button>
          <Button
            variant="primary"
            onClick={onStartInstall}
            disabled={
              (managedExistingInstall && wipeOnReinstall && !confirmWipeOnReinstall)
              || (installDecision?.action === "downgrade" && !allowDowngrade)
            }
          >
            {installDecision?.action === "update" ? "Update" : managedExistingInstall ? "Reinstall" : "Install"}
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "options") {
    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <h1>{installerText("ui.optionsTitle")}</h1>
        <p class={`subtitle ${subtitle}`}>{installerText("ui.optionsSubtitle")}</p>
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
                          ...(option.required ? [] : [{ value: "", label: "No selection" }]),
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
                        Enabled
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
                        placeholder={option.required ? "Required" : "Optional"}
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
          <Button onClick={onGoBackFromOptionsStep}>Back</Button>
          <Button variant="primary" onClick={onContinueFromOptionsStep} disabled={validatingInstallOptions}>
            {validatingInstallOptions ? "Validating..." : "Continue"}
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "progress") {
    return (
      <Panel class={installerPanel}>
        {renderStepper()}
        <h1>{installerText("ui.installingTitle", { appName: packageInfo.displayName })}</h1>
        <p class={`subtitle ${subtitle}`}>{statusText}</p>
        <p class={`subtitle ${subtitle}`}>{installerText("ui.installingStateLine")}</p>
        <ProgressBar
          value={progress}
          class={progressWrap}
          ariaLabel={installerText("ui.installProgressAria", { state: installLifecycleState })}
        />
        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button disabled={isBusy}>Cancel</Button>
        </div>
      </Panel>
    );
  }

  if (step === "failed") {
    return (
      <Panel class={`package-panel ${packagePanel} ${installerPanel}`}>
        {renderStepper()}
        <h1>{installerText("ui.installFailedTitle")}</h1>
        <p class={`subtitle ${subtitle}`}>{installerText("ui.installFailedSubtitle")}</p>
        <p class={`subtitle ${subtitle}`}>{installerText("ui.installFailedDetailsSubtitle")}</p>

        {installFailure ? (
          <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
            <div class={`meta-section-header ${metaSectionHeader}`}>
              <h2>{installerText("ui.failureDetailsHeading")}</h2>
            </div>
            <MessagePanel tone="error" class="open-package-error-box">
              <p class={openPackageErrorBoxText}>
                <strong>Time:</strong> <code>{installFailure.capturedAtDisplay}</code>
              </p>
              <pre class={`open-package-error-pre ${openPackageErrorPre}`}><code>{installFailure.details}</code></pre>
            </MessagePanel>
          </section>
        ) : null}

        <div class={`actions ${actions} ${installerActionRow}`}>
          <Button onClick={() => onSetStep("scope")}>Retry</Button>
          <Button onClick={onCopyInstallFailureDetails} disabled={!installFailure}>Copy details</Button>
          <Button onClick={onOpenInstallLogsDirectory}>Open logs</Button>
          <Button variant="primary" onClick={onClearSelectedPackage}>Close</Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      class={`package-panel ${packagePanel} ${installerPanel}`}
      showCornerClose
      cornerCloseTitle="Back to installed apps"
      onCornerClose={onCloseInstallComplete}
    >
      {renderStepper()}
      <h1>{installerText("ui.installCompleteTitle")}</h1>
      <p class={`subtitle ${subtitle}`}>{installerText("ui.installCompleteSubtitle", { appName: packageInfo.displayName })}</p>

      {preview ? (
        <MetaCardGrid compact>
          <div>
            <dt>Scope</dt>
            <dd>{formatInstallScopeLabel(preview.installScope)}</dd>
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
        </MetaCardGrid>
      ) : null}

      {preview ? (
        <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
          <div class={`meta-section-header technical-toggle-only ${metaSectionHeader} ${technicalToggleOnly}`}>
            <SectionToggleButton
              expanded={showCompleteTechnicalDetails}
              onToggle={onToggleCompleteTechnicalDetails}
              showLabel="Show technical details"
              hideLabel="Hide technical details"
              controlsId="install-complete-technical-details"
            />
          </div>

          {showCompleteTechnicalDetails ? (
            <MetaCardGrid compact id="install-complete-technical-details">
              <MetaField
                label="Launch path"
                tooltip="The resolved executable path that Yambuck tries to run."
                copyValue={`${preview.destinationPath}/${packageInfo.entrypoint}`}
                onCopySuccess={onMetaFieldCopied}
                value={<code>{`${preview.destinationPath}/${packageInfo.entrypoint}`}</code>}
              />
              <MetaField
                label="Entrypoint"
                tooltip="The launch command path declared by the package manifest."
                copyValue={packageInfo.entrypoint}
                onCopySuccess={onMetaFieldCopied}
                value={<code>{packageInfo.entrypoint}</code>}
              />
              <MetaField label="Manifest" tooltip="Manifest schema version for this package." value={packageInfo.manifestVersion} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="App ID" tooltip="Stable identifier used by Yambuck for ownership and updates." value={packageInfo.appId} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="App UUID" tooltip="Immutable app identity UUID set by the publisher." value={packageInfo.appUuid} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Package UUID" tooltip="Unique UUID for this specific package build artifact." value={packageInfo.packageUuid} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Config path" tooltip="Optional config path from manifest. Not inferred by Yambuck." value={displayOrFallback(packageInfo.configPath)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Cache path" tooltip="Optional cache path from manifest. Not inferred by Yambuck." value={displayOrFallback(packageInfo.cachePath)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Temp path" tooltip="Optional temp path from manifest. Not inferred by Yambuck." value={displayOrFallback(packageInfo.tempPath)} onCopySuccess={onMetaFieldCopied} />
            </MetaCardGrid>
          ) : null}
        </section>
      ) : null}

      <div class={`actions ${actions} ${installerActionRow}`}>
        {onViewInstalledDetails ? <Button onClick={onViewInstalledDetails}>Show installed details</Button> : null}
        <Button variant="primary" onClick={onLaunchCurrentPackage}>Launch app</Button>
      </div>
    </Panel>
  );
};
