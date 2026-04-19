import { CardCloseButton } from "../../CardCloseButton";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { MetaField } from "../../components/ui/MetaField";
import { TextField } from "../../components/ui/TextField";
import { SelectField } from "../../components/ui/SelectField";
import type {
  InstallOptionDefinition,
  InstallOptionValue,
  InstallDecision,
  InstallPreview,
  InstallScope,
  PackageInfo,
  WizardStep,
} from "../../types/app";
import { displayOrFallback, truncateDescription } from "../../utils/text";

type InstallerPageProps = {
  step: WizardStep;
  packageInfo: PackageInfo | null;
  checkingPreflight: boolean;
  preflightBlockedMessage: string;
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
  onOpenInstallLogsDirectory: () => void;
  onSetLicenseAccepted: (value: boolean) => void;
  onSetScope: (scope: InstallScope) => void;
  onStartInstall: () => void;
  onCloseInstallComplete: () => void;
  onToggleCompleteTechnicalDetails: () => void;
  onLaunchCurrentPackage: () => void;
};

export const InstallerPage = ({
  step,
  packageInfo,
  checkingPreflight,
  preflightBlockedMessage,
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
  onOpenInstallLogsDirectory,
  onSetLicenseAccepted,
  onSetScope,
  onStartInstall,
  onCloseInstallComplete,
  onToggleCompleteTechnicalDetails,
  onLaunchCurrentPackage,
}: InstallerPageProps) => {
  if (step === "details") {
    return (
      <section class="panel primary-panel package-panel">
        {packageInfo ? (
          <>
            <div class="details-header">
              <div>
                <h1>{packageInfo.displayName}</h1>
                <p class="subtitle">Review package details and install when ready</p>
              </div>
              <div class="details-actions" data-no-drag="true">
                <Button variant="primary" onClick={onContinueFromDetails} disabled={checkingPreflight}>
                  {checkingPreflight ? "Checking..." : "Install"}
                </Button>
              </div>
            </div>

            <CardCloseButton title="Close package" onClick={onClearSelectedPackage} />

            {preflightBlockedMessage ? (
              <div class="trust-box warning">
                <p class="trust-title">Install blocked</p>
                <p>{preflightBlockedMessage}</p>
              </div>
            ) : null}

            <div class="package-overview">
              {packageInfo.iconDataUrl ? (
                <img class="package-icon" src={packageInfo.iconDataUrl} alt={`${packageInfo.displayName} icon`} />
              ) : (
                <div class="package-icon placeholder">No icon</div>
              )}
              <div>
                <p class="subtitle package-description">{truncateDescription(packageInfo.description)}</p>
              </div>
            </div>

            {packageInfo.screenshotDataUrls.length > 0 ? (
              <div class="screenshot-strip" data-no-drag="true">
                {packageInfo.screenshotDataUrls.map((source, index) => (
                  <button
                    key={`${packageInfo.packageUuid}-${index}`}
                    class="screenshot-tile"
                    onClick={() => onOpenScreenshotModal(packageInfo.screenshotDataUrls, index)}
                    title={`Open screenshot ${index + 1}`}
                  >
                    <img src={source} alt={`Screenshot ${index + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}

            <section class="meta-section">
              <div class="meta-section-header">
                <h2>App details</h2>
              </div>
              <dl class="meta-grid">
                <MetaField label="Publisher" tooltip="The team or company that published this app." value={packageInfo.publisher} />
                <MetaField label="Version" tooltip="The app version that will be installed." value={packageInfo.version} />
                {packageInfo.homepageUrl ? (
                  <MetaField
                    label="Homepage"
                    tooltip="The app's official website for product information."
                    copyValue={packageInfo.homepageUrl}
                    value={
                      <a class="meta-link" href={packageInfo.homepageUrl} target="_blank" rel="noreferrer">
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
                    value={
                      <a class="meta-link" href={packageInfo.supportUrl} target="_blank" rel="noreferrer">
                        {packageInfo.supportUrl}
                      </a>
                    }
                  />
                ) : null}
                {packageInfo.license ? (
                  <MetaField
                    label="License"
                    tooltip="The legal terms for using this app."
                    value={(
                      <span class="meta-inline-actions license-actions">
                        <span class="license-action-label">{packageInfo.license}</span>
                        {packageInfo.licenseText ? (
                          <Button
                            size="inline"
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
                    value={(
                      <span class="meta-inline-actions license-actions">
                        <Button
                          size="inline"
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
                />
              </dl>
            </section>

            <section class="meta-section technical">
              <div class="meta-section-header technical-toggle-only">
                <button class="meta-toggle" type="button" onClick={onToggleTechnicalDetails}>
                  {showTechnicalDetails ? "Hide technical details" : "Show technical details"}
                </button>
              </div>
              {showTechnicalDetails ? (
                <dl class="meta-grid">
                  <MetaField label="Package" tooltip="The package file name selected for this install." value={packageInfo.fileName} />
                  <MetaField label="Manifest" tooltip="The manifest schema version this package was built with." value={packageInfo.manifestVersion} />
                  <MetaField label="App ID" tooltip="A stable identifier Yambuck uses for updates and app tracking." value={packageInfo.appId} />
                  <MetaField
                    label="Entrypoint"
                    tooltip="The internal command Yambuck uses to launch the installed app."
                    copyValue={packageInfo.entrypoint}
                    value={<code>{packageInfo.entrypoint}</code>}
                  />
                  <MetaField label="App UUID" tooltip="The immutable app identity UUID declared by the publisher." value={packageInfo.appUuid} />
                  <MetaField label="Package UUID" tooltip="The unique UUID assigned to this specific package build." value={packageInfo.packageUuid} />
                </dl>
              ) : null}
            </section>

            {packageInfo.longDescription?.trim() ? (
              <section class="meta-section long-description">
                <div class="meta-section-header">
                  <h2>About this app</h2>
                </div>
                <div class="long-description-card">
                  <p>{packageInfo.longDescription}</p>
                </div>
              </section>
            ) : null}
          </>
        ) : packageOpenError ? (
          <>
            <h1>We couldn't open this package</h1>
            <p class="subtitle">Looks like there was an issue opening this .yambuck file.</p>
            <p class="subtitle">The package may be missing required information or contains invalid files. Please contact the developer or publisher and share the error details below.</p>
            <section class="meta-section technical open-package-error-section">
              <div class="meta-section-header">
                <h2>Error details</h2>
              </div>
              <div class="trust-box warning open-package-error-box">
                <p>
                  <strong>Package:</strong> <code>{packageOpenError.packageFile}</code>
                </p>
                <p>
                  <strong>Time:</strong> <code>{packageOpenError.capturedAtDisplay}</code>
                </p>
                <pre class="open-package-error-pre"><code>Error: {packageOpenError.message}</code></pre>
              </div>
            </section>
            <div class="actions">
              <Button onClick={onClearSelectedPackage}>Close</Button>
              <Button variant="primary" onClick={onCopyPackageOpenErrorDetails}>Copy details</Button>
            </div>
          </>
        ) : (
          <>
            <h1>Choose package</h1>
            <p class="subtitle">Open a package file to start guided installation</p>
            <div class="actions start">
              <Button variant="primary" onClick={onChoosePackage}>
                Open .yambuck file
              </Button>
            </div>
          </>
        )}
      </section>
    );
  }

  if (!packageInfo) {
    return null;
  }

  if (step === "trust") {
    const isVerified = packageInfo.trustStatus === "verified";
    return (
      <section class="panel primary-panel">
        <h1>Trust and verification</h1>
        <div class={`trust-box ${isVerified ? "verified" : "warning"}`}>
          <p class="trust-title">{isVerified ? "Verified publisher" : "Publisher not verified"}</p>
          <p>{isVerified ? "This package is signed by a trusted publisher key." : "Only install if you trust this source."}</p>
        </div>
        <div class="actions">
          <Button onClick={onGoBackFromTrustStep}>Back</Button>
          <Button variant="primary" onClick={onContinueFromTrustStep}>
            {isVerified ? "Next" : "Install anyway"}
          </Button>
        </div>
      </section>
    );
  }

  if (step === "license") {
    const licenseText = packageInfo.licenseText?.trim() ?? "";
    return (
      <section class="panel primary-panel">
        <h1>License agreement</h1>
        <p class="subtitle">Review and accept the package license before continuing.</p>
        <div class="trust-box warning">
          <p class="trust-title">Acceptance required</p>
          <p>This package requires explicit license acceptance as declared in its manifest.</p>
        </div>
        <div class="actions start">
          {licenseText ? (
            <Button onClick={() => onOpenLicenseViewer(`${packageInfo.displayName} License`, licenseText)}>
              View license
            </Button>
          ) : (
            <p class="subtitle">License content is missing. This package cannot be installed.</p>
          )}
        </div>
        <CheckboxField checked={licenseAccepted} disabled={!licenseText} onChange={onSetLicenseAccepted} class="license-acceptance">
          I have read and accept this package license.
        </CheckboxField>
        <div class="actions">
          <Button onClick={onGoBackFromLicenseStep}>Back</Button>
          <Button variant="primary" onClick={onContinueFromLicenseStep} disabled={!licenseText || !licenseAccepted}>
            Continue
          </Button>
        </div>
      </section>
    );
  }

  if (step === "scope") {
    return (
      <section class="panel primary-panel">
        <h1>{managedExistingInstall ? "Reinstall scope" : "Install scope"}</h1>
        <p class="subtitle">
          {managedExistingInstall
            ? "Choose reinstall behavior and who can use this application"
            : "Choose who can use this application"}
        </p>
        <div class="scope-grid">
          <label class={`scope-card ${scope === "user" ? "active" : ""}`}>
            <input type="radio" name="scope" checked={scope === "user"} onChange={() => onSetScope("user")} />
            <span>Just for me</span>
            <small>Recommended. No admin prompt needed.</small>
          </label>
          <label class={`scope-card ${scope === "system" ? "active" : ""}`}>
            <input type="radio" name="scope" checked={scope === "system"} onChange={() => onSetScope("system")} />
            <span>All users</span>
            <small>May require admin permissions.</small>
          </label>
        </div>
        {managedExistingInstall ? (
          <section class="meta-section technical">
            <div class="meta-section-header">
              <h2>Reinstall options</h2>
            </div>
            {installDecision ? (
              <div class="trust-box warning">
                <p class="trust-title">{installDecision.action === "update" ? "Update" : installDecision.action === "reinstall" ? "Reinstall" : installDecision.action === "downgrade" ? "Downgrade" : "Install"}</p>
                <p>{installDecision.message}</p>
                {installDecision.existingVersion ? (
                  <p>
                    Installed: <code>{installDecision.existingVersion}</code> {"->"} Package: <code>{installDecision.incomingVersion}</code>
                  </p>
                ) : null}
              </div>
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
        <div class="actions">
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
      </section>
    );
  }

  if (step === "options") {
    return (
      <section class="panel primary-panel">
        <h1>Installer options</h1>
        <p class="subtitle">Choose any package-defined options before continuing.</p>
        {installOptions.length === 0 ? (
          <div class="trust-box warning">
            <p class="trust-title">No options defined</p>
            <p>This step is present in the workflow but the package provided no option schema.</p>
          </div>
        ) : (
          <div class="meta-grid">
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
                      <SelectField
                        value={selectedValue}
                        onChange={(event) =>
                          onSetInstallOptionValue(option.id, {
                            type: "select",
                            value: (event.currentTarget as HTMLSelectElement).value,
                          })
                        }
                      >
                        {!option.required ? <option value="">No selection</option> : null}
                        {option.choices.map((choice) => (
                          <option key={`${option.id}-${choice.value}`} value={choice.value}>
                            {choice.label}
                          </option>
                        ))}
                      </SelectField>
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
          </div>
        )}
        {installOptionError ? (
          <div class="trust-box warning">
            <p class="trust-title">Invalid options</p>
            <p>{installOptionError}</p>
          </div>
        ) : null}
        <div class="actions">
          <Button onClick={onGoBackFromOptionsStep}>Back</Button>
          <Button variant="primary" onClick={onContinueFromOptionsStep} disabled={validatingInstallOptions}>
            {validatingInstallOptions ? "Validating..." : "Continue"}
          </Button>
        </div>
      </section>
    );
  }

  if (step === "progress") {
    return (
      <section class="panel primary-panel">
        <h1>Installing {packageInfo.displayName}</h1>
        <p class="subtitle">{statusText}</p>
        <p class="subtitle">{`State: ${installLifecycleState}`}</p>
        <div class="progress-shell" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div class="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p class="progress-value">{progress}%</p>
        <div class="actions">
          <Button disabled={isBusy}>Cancel</Button>
        </div>
      </section>
    );
  }

  if (step === "failed") {
    return (
      <section class="panel primary-panel package-panel">
        <h1>Install failed</h1>
        <p class="subtitle">{installFailure?.summary ?? "Yambuck could not complete this install."}</p>
        <p class="subtitle">Root cause summary: {installFailure?.summary ?? "Unknown failure"}</p>

        {installFailure ? (
          <section class="meta-section technical">
            <div class="meta-section-header">
              <h2>Failure details</h2>
            </div>
            <div class="trust-box warning open-package-error-box">
              <p>
                <strong>Time:</strong> <code>{installFailure.capturedAtDisplay}</code>
              </p>
              <pre class="open-package-error-pre"><code>{installFailure.details}</code></pre>
            </div>
          </section>
        ) : null}

        <div class="actions">
          <Button onClick={() => onSetStep("scope")}>Retry</Button>
          <Button onClick={onCopyInstallFailureDetails} disabled={!installFailure}>Copy details</Button>
          <Button onClick={onOpenInstallLogsDirectory}>Open logs</Button>
          <Button variant="primary" onClick={onClearSelectedPackage}>Close</Button>
        </div>
      </section>
    );
  }

  return (
    <section class="panel primary-panel package-panel">
      <h1>Install complete</h1>
      <p class="subtitle">{packageInfo.displayName} is ready to launch.</p>

      <CardCloseButton title="Back to installed apps" onClick={onCloseInstallComplete} />

      {preview ? (
        <dl class="meta-grid compact">
          <div>
            <dt>Scope</dt>
            <dd>{preview.installScope}</dd>
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
        </dl>
      ) : null}

      {preview ? (
        <section class="meta-section technical">
          <div class="meta-section-header technical-toggle-only">
            <button class="meta-toggle" type="button" onClick={onToggleCompleteTechnicalDetails}>
              {showCompleteTechnicalDetails ? "Hide technical details" : "Show technical details"}
            </button>
          </div>

          {showCompleteTechnicalDetails ? (
            <dl class="meta-grid compact">
              <MetaField
                label="Launch path"
                tooltip="The resolved executable path that Yambuck tries to run."
                copyValue={`${preview.destinationPath}/${packageInfo.entrypoint}`}
                value={<code>{`${preview.destinationPath}/${packageInfo.entrypoint}`}</code>}
              />
              <MetaField
                label="Entrypoint"
                tooltip="The launch command path declared by the package manifest."
                copyValue={packageInfo.entrypoint}
                value={<code>{packageInfo.entrypoint}</code>}
              />
              <MetaField label="Manifest" tooltip="Manifest schema version for this package." value={packageInfo.manifestVersion} />
              <MetaField label="App ID" tooltip="Stable identifier used by Yambuck for ownership and updates." value={packageInfo.appId} />
              <MetaField label="App UUID" tooltip="Immutable app identity UUID set by the publisher." value={packageInfo.appUuid} />
              <MetaField label="Package UUID" tooltip="Unique UUID for this specific package build artifact." value={packageInfo.packageUuid} />
              <MetaField label="Config path" tooltip="Optional config path from manifest. Not inferred by Yambuck." value={displayOrFallback(packageInfo.configPath)} />
              <MetaField label="Cache path" tooltip="Optional cache path from manifest. Not inferred by Yambuck." value={displayOrFallback(packageInfo.cachePath)} />
              <MetaField label="Temp path" tooltip="Optional temp path from manifest. Not inferred by Yambuck." value={displayOrFallback(packageInfo.tempPath)} />
            </dl>
          ) : null}
        </section>
      ) : null}

      <div class="actions">
        <Button onClick={() => onSetStep("details")}>Install another</Button>
        <Button variant="primary" onClick={onLaunchCurrentPackage}>Launch app</Button>
      </div>
    </section>
  );
};
