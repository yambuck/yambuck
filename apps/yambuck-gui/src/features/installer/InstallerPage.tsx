import { CardCloseButton } from "../../CardCloseButton";
import { MetaField } from "../../components/ui/MetaField";
import type { InstallPreview, InstallScope, PackageInfo, WizardStep } from "../../types/app";
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
  onContinueFromTrustStep: () => void;
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
  onContinueFromTrustStep,
  onSetLicenseAccepted,
  onSetScope,
  onStartInstall,
  onCloseInstallComplete,
  onToggleCompleteTechnicalDetails,
  onLaunchCurrentPackage,
}: InstallerPageProps) => {
  if (step === "details") {
    return (
      <section class="panel package-panel">
        {packageInfo ? (
          <>
            <div class="details-header">
              <div>
                <h1>{packageInfo.displayName}</h1>
                <p class="subtitle">Review package details and install when ready</p>
              </div>
              <div class="details-actions" data-no-drag="true">
                <button class="button primary" onClick={onContinueFromDetails} disabled={checkingPreflight}>
                  {checkingPreflight ? "Checking..." : "Install"}
                </button>
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
                      <span class="meta-inline-actions">
                        <span>{packageInfo.license}</span>
                        {packageInfo.licenseText ? (
                          <button
                            class="button ghost inline"
                            type="button"
                            onClick={() => onOpenLicenseViewer(`${packageInfo.displayName} License`, packageInfo.licenseText!)}
                          >
                            View license
                          </button>
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
                      <button
                        class="button ghost inline"
                        type="button"
                        onClick={() => onOpenLicenseViewer(`${packageInfo.displayName} License`, packageInfo.licenseText!)}
                      >
                        View license
                      </button>
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
              <div class="meta-section-header">
                <h2>Technical details</h2>
                <button class="meta-toggle" type="button" onClick={onToggleTechnicalDetails}>
                  {showTechnicalDetails ? "Hide technical details" : "Show technical details"}
                </button>
              </div>
              {showTechnicalDetails ? (
                <dl class="meta-grid">
                  <MetaField label="Package" tooltip="The package file name selected for this install." value={packageInfo.fileName} />
                  <MetaField label="Manifest" tooltip="The manifest schema version this package was built with." value={packageInfo.manifestVersion} />
                  <MetaField label="App ID" tooltip="A stable identifier Yambuck uses for updates and app tracking." value={packageInfo.appId} />
                  <MetaField label="Entrypoint" tooltip="The internal command Yambuck uses to launch the installed app." value={<code>{packageInfo.entrypoint}</code>} />
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
                <p>{packageInfo.longDescription}</p>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <h1>Choose package</h1>
            <p class="subtitle">Open a package file to start guided installation</p>
            <div class="actions start">
              <button class="button primary" onClick={onChoosePackage}>
                Open .yambuck file
              </button>
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
      <section class="panel">
        <h1>Trust and verification</h1>
        <div class={`trust-box ${isVerified ? "verified" : "warning"}`}>
          <p class="trust-title">{isVerified ? "Verified publisher" : "Publisher not verified"}</p>
          <p>{isVerified ? "This package is signed by a trusted publisher key." : "Only install if you trust this source."}</p>
        </div>
        <div class="actions">
          <button class="button ghost" onClick={() => onSetStep("details")}>Back</button>
          <button class="button primary" onClick={onContinueFromTrustStep}>
            {isVerified ? "Next" : "Install anyway"}
          </button>
        </div>
      </section>
    );
  }

  if (step === "license") {
    const licenseText = packageInfo.licenseText?.trim() ?? "";
    return (
      <section class="panel">
        <h1>License agreement</h1>
        <p class="subtitle">Review and accept the package license before continuing.</p>
        <div class="trust-box warning">
          <p class="trust-title">Acceptance required</p>
          <p>This package requires explicit license acceptance as declared in its manifest.</p>
        </div>
        <div class="actions start">
          {licenseText ? (
            <button class="button ghost" onClick={() => onOpenLicenseViewer(`${packageInfo.displayName} License`, licenseText)}>
              View license
            </button>
          ) : (
            <p class="subtitle">License content is missing. This package cannot be installed.</p>
          )}
        </div>
        <label class="license-acceptance">
          <input
            type="checkbox"
            checked={licenseAccepted}
            disabled={!licenseText}
            onChange={(event) => onSetLicenseAccepted((event.target as HTMLInputElement).checked)}
          />
          <span>I have read and accept this package license.</span>
        </label>
        <div class="actions">
          <button class="button ghost" onClick={() => onSetStep("trust")}>Back</button>
          <button class="button primary" onClick={() => onSetStep("scope")} disabled={!licenseText || !licenseAccepted}>
            Continue
          </button>
        </div>
      </section>
    );
  }

  if (step === "scope") {
    return (
      <section class="panel">
        <h1>Install scope</h1>
        <p class="subtitle">Choose who can use this application</p>
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
        <div class="actions">
          <button class="button ghost" onClick={() => onSetStep("trust")}>Back</button>
          <button class="button primary" onClick={onStartInstall}>Install</button>
        </div>
      </section>
    );
  }

  if (step === "progress") {
    return (
      <section class="panel">
        <h1>Installing {packageInfo.displayName}</h1>
        <p class="subtitle">{statusText}</p>
        <div class="progress-shell" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div class="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p class="progress-value">{progress}%</p>
        <div class="actions">
          <button class="button ghost" disabled={isBusy}>Cancel</button>
        </div>
      </section>
    );
  }

  return (
    <section class="panel package-panel">
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
          <div class="meta-section-header">
            <h2>Technical details</h2>
            <button class="meta-toggle" type="button" onClick={onToggleCompleteTechnicalDetails}>
              {showCompleteTechnicalDetails ? "Hide technical details" : "Show technical details"}
            </button>
          </div>

          {showCompleteTechnicalDetails ? (
            <dl class="meta-grid compact">
              <MetaField
                label="Launch path"
                tooltip="The resolved executable path that Yambuck tries to run."
                value={<code>{`${preview.destinationPath}/${packageInfo.entrypoint}`}</code>}
              />
              <MetaField
                label="Entrypoint"
                tooltip="The launch command path declared by the package manifest."
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
        <button class="button ghost" onClick={() => onSetStep("details")}>Install another</button>
        <button class="button primary" onClick={onLaunchCurrentPackage}>Launch app</button>
      </div>
    </section>
  );
};
