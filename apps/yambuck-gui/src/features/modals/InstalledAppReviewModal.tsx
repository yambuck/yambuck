import { useState } from "preact/hooks";
import { Button } from "../../components/ui/Button";
import { MetaField } from "../../components/ui/MetaField";
import { ModalShell } from "../../components/ui/ModalShell";
import type { InstalledAppDetails } from "../../types/app";
import { displayOrFallback, truncateDescription } from "../../utils/text";
import { formatCanonicalTimestampForDisplay } from "../../utils/time";

type InstalledAppReviewModalProps = {
  details: InstalledAppDetails;
  onClose: () => void;
  onOpenScreenshot: (gallery: string[], index: number) => void;
  onOpenLicense: (title: string, text: string) => void;
};

export const InstalledAppReviewModal = ({
  details,
  onClose,
  onOpenScreenshot,
  onOpenLicense,
}: InstalledAppReviewModalProps) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <ModalShell onClose={onClose} cardClass="panel package-panel installed-review-modal" closeTitle="Close review">
      <section class="modal-section">
        <div class="screenshot-modal-toolbar">
          <span>{`Installed package review: ${details.displayName}`}</span>
        </div>

      <p class="subtitle">Review archived package details from the package snapshot Yambuck kept at install time.</p>

      <div class="package-overview installed-review-overview">
        {details.packageInfo.iconDataUrl ? (
          <img class="package-icon" src={details.packageInfo.iconDataUrl} alt={`${details.displayName} icon`} />
        ) : (
          <div class="package-icon placeholder">No icon</div>
        )}
        <div>
          <p class="subtitle package-description">{truncateDescription(details.packageInfo.description)}</p>
        </div>
      </div>

      {details.packageInfo.screenshotDataUrls.length > 0 ? (
        <div class="screenshot-strip" data-no-drag="true">
          {details.packageInfo.screenshotDataUrls.map((source, index) => (
            <button
              key={`installed-shot-${details.appId}-${index}`}
              class="screenshot-tile"
              onClick={() => onOpenScreenshot(details.packageInfo.screenshotDataUrls, index)}
              title={`Open screenshot ${index + 1}`}
            >
              <img src={source} alt={`Installed screenshot ${index + 1}`} />
            </button>
          ))}
        </div>
      ) : null}

        <dl class="meta-grid compact">
          <MetaField label="Publisher" tooltip="The team or company that published this app." value={details.packageInfo.publisher} />
          <MetaField label="Version" tooltip="The app version from the archived package manifest." value={details.version} />
          <MetaField
            label="Installed"
            tooltip="Timestamp when Yambuck registered this installation (ISO 8601)."
            value={formatCanonicalTimestampForDisplay(details.installedAt)}
          />
          <MetaField label="Scope" tooltip="Install scope used for this app." value={details.installScope} />
          <MetaField
            label="License"
            tooltip="The legal terms bundled in the archived package copy."
            value={(
              <span class="meta-inline-actions license-actions">
                <span class="license-action-label">{displayOrFallback(details.packageInfo.license)}</span>
                {details.packageInfo.licenseText ? (
                  <Button
                    size="inline"
                    onClick={() => onOpenLicense(`${details.displayName} License`, details.packageInfo.licenseText!)}
                  >
                    View license
                  </Button>
                ) : null}
              </span>
            )}
          />
          <MetaField label="Trust" tooltip="Trust status captured from the archived manifest." value={details.packageInfo.trustStatus} />
        </dl>

        <section class="meta-section technical">
          <div class="meta-section-header technical-toggle-only">
            <button class="meta-toggle" type="button" onClick={() => setShowTechnicalDetails((value) => !value)}>
              {showTechnicalDetails ? "Hide technical details" : "Show technical details"}
            </button>
          </div>
          {showTechnicalDetails ? (
            <dl class="meta-grid">
              <MetaField
                label="Install path"
                tooltip="Installed payload root managed by Yambuck."
                copyValue={details.destinationPath}
                value={<code>{details.destinationPath}</code>}
              />
              <MetaField label="Package" tooltip="Archived .yambuck file name stored by Yambuck." value={details.packageInfo.fileName} />
              <MetaField label="Manifest" tooltip="Manifest schema version from the archived package." value={details.packageInfo.manifestVersion} />
              <MetaField label="App ID" tooltip="Stable app identifier used by Yambuck." value={details.appId} />
              <MetaField label="App UUID" tooltip="Publisher-defined immutable app identity UUID." value={details.packageInfo.appUuid} />
              <MetaField label="Package UUID" tooltip="Immutable UUID for this archived package build." value={details.packageInfo.packageUuid} />
              <MetaField
                label="Entrypoint"
                tooltip="Launch command path declared by the package manifest."
                copyValue={details.packageInfo.entrypoint}
                value={<code>{details.packageInfo.entrypoint}</code>}
              />
              <MetaField label="Config location" tooltip="Optional config location from manifest. Not inferred by Yambuck." value={displayOrFallback(details.packageInfo.configPath)} />
              <MetaField label="Cache location" tooltip="Optional cache location from manifest. Not inferred by Yambuck." value={displayOrFallback(details.packageInfo.cachePath)} />
              <MetaField label="Temp location" tooltip="Optional temp location from manifest. Not inferred by Yambuck." value={displayOrFallback(details.packageInfo.tempPath)} />
              <MetaField label="Icon asset" tooltip="Manifest icon path relative to package root." value={displayOrFallback(details.packageInfo.iconPath)} />
              <MetaField label="License file" tooltip="Manifest license file path if provided by publisher." value={displayOrFallback(details.packageInfo.licenseFile)} />
              <MetaField label="Support URL" tooltip="Publisher support URL from package metadata." value={displayOrFallback(details.packageInfo.supportUrl)} />
              <MetaField label="Homepage URL" tooltip="Publisher homepage URL from package metadata." value={displayOrFallback(details.packageInfo.homepageUrl)} />
              <MetaField label="Screenshots" tooltip="Screenshot assets declared in the manifest." value={details.packageInfo.screenshots.length} />
            </dl>
          ) : null}
        </section>

      {details.packageInfo.longDescription?.trim() ? (
        <section class="meta-section long-description installed-review-long-description">
          <div class="meta-section-header">
            <h2>About this app</h2>
          </div>
          <div class="long-description-card">
            <p>{details.packageInfo.longDescription}</p>
          </div>
        </section>
      ) : null}
      </section>
    </ModalShell>
  );
};
