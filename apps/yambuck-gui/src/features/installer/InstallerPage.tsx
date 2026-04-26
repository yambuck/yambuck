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

const buildInstallerSteps = (includeLicense: boolean): WizardStepperStep[] => {
  const steps: WizardStepperStep[] = [
    { id: "details", label: "Details" },
    { id: "trust", label: "Trust" },
  ];
  if (includeLicense) {
    steps.push({ id: "license", label: "License" });
  }
  steps.push(
    { id: "options", label: "Options" },
    { id: "scope", label: "Scope" },
    { id: "progress", label: "Install" },
    { id: "complete", label: "Done" },
  );
  return steps;
};

type InstallerPageProps = {
  step: WizardStep;
  packageInfo: PackageInfo | null;
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
  const installerSteps = buildInstallerSteps(includeLicenseStep);
  const currentStepId = step === "failed" ? "progress" : step;

  const renderStepper = () => (
    <WizardStepper steps={installerSteps} currentStepId={currentStepId} />
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
        class={`package-panel ${packagePanel}`}
        showCornerClose={packageInfo !== null}
        cornerCloseTitle="Close package"
        onCornerClose={onClearSelectedPackage}
      >
        {renderStepper()}
        {packageInfo ? (
          <>
            <div class={`details-header ${detailsHeader}`}>
              <div>
                <h1>{packageInfo.displayName}</h1>
                <p class={`subtitle ${subtitle}`}>Review package details and install when ready</p>
              </div>
              <div class={`details-actions ${detailsActions}`} data-no-drag="true">
                <Button variant="primary" onClick={onContinueFromDetails} disabled={checkingPreflight}>
                  {checkingPreflight ? "Checking..." : "Install"}
                </Button>
              </div>
            </div>
            {preflightBlockedMessage ? (
              <MessagePanel tone="error" title="Install blocked">
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
              <MessagePanel tone="warning" title="Terminal app">
                <p>
                  This package installs a command-line app. It does not open a desktop window.
                  Open Terminal and run the command shown below after install.
                </p>
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
            <h1>We couldn't open this package</h1>
            <p class={`subtitle ${subtitle}`}>Looks like there was an issue opening this .yambuck file.</p>
            <p class={`subtitle ${subtitle}`}>The package may be missing required information or contains invalid files. Please contact the developer or publisher and share the error details below.</p>
            <section class={`meta-section technical open-package-error-section ${openPackageErrorSection}`}>
              <div class={`meta-section-header ${metaSectionHeader}`}>
                <h2>Error details</h2>
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
            <div class={`actions ${actions}`}>
              <Button onClick={onClearSelectedPackage}>Close</Button>
              <Button variant="primary" onClick={onCopyPackageOpenErrorDetails}>Copy details</Button>
            </div>
          </>
        ) : (
          <>
            <h1>Choose package</h1>
            <p class={`subtitle ${subtitle}`}>Open a package file to start guided installation</p>
            <div class={`actions start ${actions} ${actionsStart}`}>
              <Button variant="primary" onClick={onChoosePackage}>
                Open .yambuck file
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
      <Panel>
        {renderStepper()}
        <h1>Trust and verification</h1>
        <MessagePanel tone={isVerified ? "success" : "warning"} title={isVerified ? "Verified publisher" : "Publisher not verified"}>
          <p>{isVerified ? "This package is signed by a trusted publisher key." : "Only install if you trust this source."}</p>
        </MessagePanel>
        <div class={`actions ${actions}`}>
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
      <Panel>
        {renderStepper()}
        <h1>License agreement</h1>
        <p class={`subtitle ${subtitle}`}>Review and accept the package license before continuing.</p>
        <div class={`actions start ${actions} ${actionsStart}`}>
          {licenseText ? (
            <Button onClick={() => onOpenLicenseViewer(`${packageInfo.displayName} License`, licenseText)}>
              View license
            </Button>
          ) : (
            <p class={`subtitle ${subtitle}`}>License content is missing. This package cannot be installed.</p>
          )}
        </div>
        <CheckboxField checked={licenseAccepted} disabled={!licenseText} onChange={onSetLicenseAccepted} class="license-acceptance">
          I have read and accept this package license.
        </CheckboxField>
        {!licenseAccepted ? (
          <p class={licenseRequirementNote}>The publisher requires license acceptance before install can continue.</p>
        ) : null}
        <div class={`actions ${actions}`}>
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
      <Panel>
        {renderStepper()}
        <h1>{managedExistingInstall ? "Reinstall scope" : "Install scope"}</h1>
        <p class={`subtitle ${subtitle}`}>
          {managedExistingInstall
            ? "Choose reinstall behavior and who can use this application"
            : "Choose who can use this application"}
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
          <MessagePanel tone="info" title="Also installed in another scope" class={scopeNotice}>
            <p>
              You already have version <code>{installDecision.otherScopeExistingVersion}</code> installed in {" "}
              <strong>{formatInstallScopeLabel(installDecision.otherScope)}</strong>.
            </p>
          </MessagePanel>
        ) : null}
        {managedExistingInstall ? (
          <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
            <div class={`meta-section-header ${metaSectionHeader}`}>
              <h2>Reinstall options</h2>
            </div>
            {installDecision ? (
              <MessagePanel
                tone={installDecision.action === "downgrade" ? "warning" : "info"}
                title={installDecision.action === "update" ? "Update" : installDecision.action === "reinstall" ? "Reinstall" : installDecision.action === "downgrade" ? "Downgrade" : "Install"}
              >
                <p>{installDecision.message}</p>
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
        <div class={`actions ${actions}`}>
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
      <Panel>
        {renderStepper()}
        <h1>Installer options</h1>
        <p class={`subtitle ${subtitle}`}>Choose any package-defined options before continuing.</p>
        {installOptions.length === 0 ? (
          <MessagePanel tone="info" title="No options defined">
            <p>This step is present in the workflow but the package provided no option schema.</p>
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
          <MessagePanel tone="error" title="Invalid options">
            <p>{installOptionError}</p>
          </MessagePanel>
        ) : null}
        <div class={`actions ${actions}`}>
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
      <Panel>
        {renderStepper()}
        <h1>Installing {packageInfo.displayName}</h1>
        <p class={`subtitle ${subtitle}`}>{statusText}</p>
        <p class={`subtitle ${subtitle}`}>{`State: ${installLifecycleState}`}</p>
        <ProgressBar value={progress} class={progressWrap} ariaLabel="Install progress" />
        <div class={`actions ${actions}`}>
          <Button disabled={isBusy}>Cancel</Button>
        </div>
      </Panel>
    );
  }

  if (step === "failed") {
    return (
      <Panel class={`package-panel ${packagePanel}`}>
        {renderStepper()}
        <h1>Install failed</h1>
        <p class={`subtitle ${subtitle}`}>{installFailure?.summary ?? "Yambuck could not complete this install."}</p>
        <p class={`subtitle ${subtitle}`}>Root cause summary: {installFailure?.summary ?? "Unknown failure"}</p>

        {installFailure ? (
          <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
            <div class={`meta-section-header ${metaSectionHeader}`}>
              <h2>Failure details</h2>
            </div>
            <MessagePanel tone="error" class="open-package-error-box">
              <p class={openPackageErrorBoxText}>
                <strong>Time:</strong> <code>{installFailure.capturedAtDisplay}</code>
              </p>
              <pre class={`open-package-error-pre ${openPackageErrorPre}`}><code>{installFailure.details}</code></pre>
            </MessagePanel>
          </section>
        ) : null}

        <div class={`actions ${actions}`}>
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
      class={`package-panel ${packagePanel}`}
      showCornerClose
      cornerCloseTitle="Back to installed apps"
      onCornerClose={onCloseInstallComplete}
    >
      {renderStepper()}
      <h1>Install complete</h1>
      <p class={`subtitle ${subtitle}`}>{packageInfo.displayName} is ready to launch.</p>

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

      <div class={`actions ${actions}`}>
        {onViewInstalledDetails ? <Button onClick={onViewInstalledDetails}>Show installed details</Button> : null}
        <Button variant="primary" onClick={onLaunchCurrentPackage}>Launch app</Button>
      </div>
    </Panel>
  );
};
