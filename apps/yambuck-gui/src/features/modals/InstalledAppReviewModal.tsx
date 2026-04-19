import { MetaField } from "../../components/ui/MetaField";
import { CardCloseButton } from "../../CardCloseButton";
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
}: InstalledAppReviewModalProps) => (
  <div class="modal-overlay topbar-safe" data-no-drag="true" onClick={onClose}>
    <section class="modal-card panel package-panel installed-review-modal" onClick={(event) => event.stopPropagation()}>
      <CardCloseButton title="Close review" onClick={onClose} />
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
            <span class="meta-inline-actions">
              <span>{displayOrFallback(details.packageInfo.license)}</span>
              {details.packageInfo.licenseText ? (
                <button
                  class="button ghost inline"
                  type="button"
                  onClick={() => onOpenLicense(`${details.displayName} License`, details.packageInfo.licenseText!)}
                >
                  View license
                </button>
              ) : null}
            </span>
          )}
        />
        <MetaField label="Trust" tooltip="Trust status captured from the archived manifest." value={details.packageInfo.trustStatus} />
      </dl>

      {details.packageInfo.longDescription?.trim() ? (
        <section class="meta-section long-description installed-review-long-description">
          <div class="meta-section-header">
            <h2>About this app</h2>
          </div>
          <p>{details.packageInfo.longDescription}</p>
        </section>
      ) : null}
    </section>
  </div>
);
