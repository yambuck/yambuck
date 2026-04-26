import { useState } from "preact/hooks";
import { Button } from "../../components/ui/Button";
import { MetaField } from "../../components/ui/MetaField";
import { inlineActions, licenseActions, licenseLabel } from "../../components/ui/metaField.css";
import { ModalShell } from "../../components/ui/ModalShell";
import type { InstalledAppDetails } from "../../types/app";
import { formatInstallScopeLabel } from "../../utils/scope";
import { displayOrFallback } from "../../utils/text";
import { formatCanonicalTimestampForDisplay } from "../../utils/time";
import { PackageDetailsSections } from "../shared/PackageDetailsSections";
import {
  detailsActions,
  detailsHeader,
} from "../shared/packageUi.css";
import {
  installedReviewCard,
  installedReviewLongDescription,
  installedReviewOverview,
  section,
} from "./modalStyles.css";

type InstalledAppReviewModalProps = {
  details: InstalledAppDetails;
  onClose: () => void;
  onOpenScreenshot: (gallery: string[], index: number) => void;
  onOpenLicense: (title: string, text: string) => void;
  onMetaFieldCopied: (label: string) => void;
  onLaunch: () => void;
  onUninstall: () => void;
};

export const InstalledAppReviewModal = ({
  details,
  onClose,
  onOpenScreenshot,
  onOpenLicense,
  onMetaFieldCopied,
  onLaunch,
  onUninstall,
}: InstalledAppReviewModalProps) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <ModalShell onClose={onClose} cardClass={`installed-review-modal ${installedReviewCard}`} closeTitle="Close review">
      <section class={`modal-section ${section}`}>
        <div class={`details-header ${detailsHeader}`}>
          <h1>{details.displayName}</h1>
          <div class={`details-actions ${detailsActions}`} data-no-drag="true">
            <Button variant="danger" onClick={onUninstall}>Uninstall</Button>
            <Button variant="primary" onClick={onLaunch}>Launch app</Button>
          </div>
        </div>
        <PackageDetailsSections
          packageInfo={details.packageInfo}
          showTechnicalDetails={showTechnicalDetails}
          onToggleTechnicalDetails={() => setShowTechnicalDetails((value) => !value)}
          onOpenScreenshot={onOpenScreenshot}
          overviewClassName={installedReviewOverview}
          longDescriptionClassName={installedReviewLongDescription}
          appDetailsContent={(
            <>
              <MetaField label="Publisher" tooltip="The team or company that published this app." value={details.packageInfo.publisher} />
              <MetaField label="Version" tooltip="The app version from the archived package manifest." value={details.version} />
              <MetaField
                label="Installed"
                tooltip="Timestamp when Yambuck registered this installation (ISO 8601)."
                value={formatCanonicalTimestampForDisplay(details.installedAt)}
              />
              <MetaField label="Scope" tooltip="Install scope used for this app." value={formatInstallScopeLabel(details.installScope)} />
              <MetaField
                label="License"
                tooltip="The legal terms bundled in the archived package copy."
                value={(
                  <span class={`meta-inline-actions ${inlineActions} license-actions ${licenseActions}`}>
                    <span class={`license-action-label ${licenseLabel}`}>{displayOrFallback(details.packageInfo.license)}</span>
                    {details.packageInfo.licenseText ? (
                      <Button
                        onClick={() => onOpenLicense(`${details.displayName} License`, details.packageInfo.licenseText!)}
                      >
                        View license
                      </Button>
                    ) : null}
                  </span>
                )}
              />
              <MetaField label="Trust" tooltip="Trust status captured from the archived manifest." value={details.packageInfo.trustStatus} />
            </>
          )}
          technicalDetailsContent={(
            <>
              <MetaField
                label="Install location"
                tooltip="Installed payload root managed by Yambuck."
                copyValue={details.destinationPath}
                value={<code>{details.destinationPath}</code>}
                onCopySuccess={onMetaFieldCopied}
              />
              <MetaField label="Package" tooltip="Archived .yambuck file name stored by Yambuck." value={details.packageInfo.fileName} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Manifest" tooltip="Manifest schema version from the archived package." value={details.packageInfo.manifestVersion} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="App ID" tooltip="Stable app identifier used by Yambuck." value={details.appId} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="App UUID" tooltip="Publisher-defined immutable app identity UUID." value={details.packageInfo.appUuid} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Package UUID" tooltip="Immutable UUID for this archived package build." value={details.packageInfo.packageUuid} onCopySuccess={onMetaFieldCopied} />
              <MetaField
                label="Entrypoint"
                tooltip="Launch command path declared by the package manifest."
                copyValue={details.packageInfo.entrypoint}
                value={<code>{details.packageInfo.entrypoint}</code>}
                onCopySuccess={onMetaFieldCopied}
              />
              <MetaField label="Config location" tooltip="Optional config location from manifest. Not inferred by Yambuck." value={displayOrFallback(details.packageInfo.configPath)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Cache location" tooltip="Optional cache location from manifest. Not inferred by Yambuck." value={displayOrFallback(details.packageInfo.cachePath)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Temp location" tooltip="Optional temp location from manifest. Not inferred by Yambuck." value={displayOrFallback(details.packageInfo.tempPath)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Icon asset" tooltip="Manifest icon path relative to package root." value={displayOrFallback(details.packageInfo.iconPath)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="License file" tooltip="Manifest license file path if provided by publisher." value={displayOrFallback(details.packageInfo.licenseFile)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Support URL" tooltip="Publisher support URL from package metadata." value={displayOrFallback(details.packageInfo.supportUrl)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Homepage URL" tooltip="Publisher homepage URL from package metadata." value={displayOrFallback(details.packageInfo.homepageUrl)} onCopySuccess={onMetaFieldCopied} />
              <MetaField label="Screenshots" tooltip="Screenshot assets declared in the manifest." value={details.packageInfo.screenshots.length} onCopySuccess={onMetaFieldCopied} />
            </>
          )}
        />
      </section>
    </ModalShell>
  );
};
