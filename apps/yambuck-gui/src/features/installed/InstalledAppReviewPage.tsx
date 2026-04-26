import { Button } from "../../components/ui/Button";
import { MetaField } from "../../components/ui/MetaField";
import { inlineActions, licenseActions, licenseLabel } from "../../components/ui/metaField.css";
import { appText } from "../../i18n/app";
import { Panel } from "../../components/ui/Panel";
import { PanelHeader } from "../../components/ui/PanelHeader";
import type { InstalledAppDetails } from "../../types/app";
import { formatInstallScopeLabel } from "../../utils/scope";
import { displayOrFallback } from "../../utils/text";
import { formatCanonicalTimestampForDisplay } from "../../utils/time";
import { PackageDetailsSections } from "../shared/PackageDetailsSections";
import { detailsActionButton, packagePanel } from "../shared/packageUi.css";

type InstalledAppReviewPageProps = {
  details: InstalledAppDetails;
  showTechnicalDetails: boolean;
  onToggleTechnicalDetails: () => void;
  onBack: () => void;
  onOpenScreenshot: (gallery: string[], index: number) => void;
  onOpenLicense: (title: string, text: string) => void;
  onMetaFieldCopied: (label: string) => void;
  onLaunch: () => void;
  onUninstall: () => void;
};

export const InstalledAppReviewPage = ({
  details,
  showTechnicalDetails,
  onToggleTechnicalDetails,
  onBack,
  onOpenScreenshot,
  onOpenLicense,
  onMetaFieldCopied,
  onLaunch,
  onUninstall,
}: InstalledAppReviewPageProps) => (
  <Panel
    class={`package-panel ${packagePanel}`}
    showCornerClose
    cornerCloseTitle={appText("review.close.backToInstalled")}
    onCornerClose={onBack}
  >
    <PanelHeader
      variant="app"
      title={details.displayName}
      iconSrc={details.packageInfo.iconDataUrl!}
      iconAlt={appText("package.iconAlt", { appName: details.displayName })}
      actions={(
        <>
          <Button class={detailsActionButton} variant="danger" onClick={onUninstall}>{appText("review.actions.uninstall")}</Button>
          <Button class={detailsActionButton} variant="primary" onClick={onLaunch}>{appText("review.actions.launch")}</Button>
        </>
      )}
    />

    <PackageDetailsSections
      packageInfo={details.packageInfo}
      showTechnicalDetails={showTechnicalDetails}
      onToggleTechnicalDetails={onToggleTechnicalDetails}
      onOpenScreenshot={onOpenScreenshot}
      showOverviewIcon={false}
      appDetailsContent={(
        <>
          <MetaField label={appText("meta.publisher.label")} tooltip={appText("meta.publisher.tooltip")} value={details.packageInfo.publisher} />
          <MetaField label={appText("meta.version.label")} tooltip={appText("meta.version.tooltip")} value={details.version} />
          <MetaField
            label={appText("meta.installed.label")}
            tooltip={appText("meta.installed.tooltip")}
            value={formatCanonicalTimestampForDisplay(details.installedAt)}
          />
          <MetaField label={appText("meta.scope.label")} tooltip={appText("meta.scope.tooltip")} value={formatInstallScopeLabel(details.installScope)} />
          <MetaField
            label={appText("meta.license.label")}
            tooltip={appText("meta.license.tooltip")}
            value={(
              <span class={`meta-inline-actions ${inlineActions} license-actions ${licenseActions}`}>
                <span class={`license-action-label ${licenseLabel}`}>{displayOrFallback(details.packageInfo.license)}</span>
                {details.packageInfo.licenseText ? (
                  <Button
                    onClick={() => onOpenLicense(appText("review.licenseTitle", { appName: details.displayName }), details.packageInfo.licenseText!)}
                  >
                    {appText("review.actions.viewLicense")}
                  </Button>
                ) : null}
              </span>
            )}
          />
          <MetaField label={appText("meta.trust.label")} tooltip={appText("meta.trust.tooltip")} value={details.packageInfo.trustStatus} />
        </>
      )}
      technicalDetailsContent={(
        <>
          <MetaField
            label={appText("meta.installLocation.label")}
            tooltip={appText("meta.installLocation.tooltip")}
            copyValue={details.destinationPath}
            value={<code>{details.destinationPath}</code>}
            onCopySuccess={onMetaFieldCopied}
          />
          <MetaField label={appText("meta.package.label")} tooltip={appText("meta.package.tooltip")} value={details.packageInfo.fileName} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.manifest.label")} tooltip={appText("meta.manifest.tooltip")} value={details.packageInfo.manifestVersion} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.appId.label")} tooltip={appText("meta.appId.tooltip")} value={details.appId} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.appUuid.label")} tooltip={appText("meta.appUuid.tooltip")} value={details.packageInfo.appUuid} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.packageUuid.label")} tooltip={appText("meta.packageUuid.tooltip")} value={details.packageInfo.packageUuid} onCopySuccess={onMetaFieldCopied} />
          <MetaField
            label={appText("meta.entrypoint.label")}
            tooltip={appText("meta.entrypoint.tooltip")}
            copyValue={details.packageInfo.entrypoint}
            value={<code>{details.packageInfo.entrypoint}</code>}
            onCopySuccess={onMetaFieldCopied}
          />
          <MetaField label={appText("meta.configLocation.label")} tooltip={appText("meta.configLocation.tooltip")} value={displayOrFallback(details.packageInfo.configPath)} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.cacheLocation.label")} tooltip={appText("meta.cacheLocation.tooltip")} value={displayOrFallback(details.packageInfo.cachePath)} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.tempLocation.label")} tooltip={appText("meta.tempLocation.tooltip")} value={displayOrFallback(details.packageInfo.tempPath)} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.iconAsset.label")} tooltip={appText("meta.iconAsset.tooltip")} value={displayOrFallback(details.packageInfo.iconPath)} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.licenseFile.label")} tooltip={appText("meta.licenseFile.tooltip")} value={displayOrFallback(details.packageInfo.licenseFile)} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.supportUrl.label")} tooltip={appText("meta.supportUrl.tooltip")} value={displayOrFallback(details.packageInfo.supportUrl)} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.homepageUrl.label")} tooltip={appText("meta.homepageUrl.tooltip")} value={displayOrFallback(details.packageInfo.homepageUrl)} onCopySuccess={onMetaFieldCopied} />
          <MetaField label={appText("meta.screenshots.label")} tooltip={appText("meta.screenshots.tooltip")} value={details.packageInfo.screenshots.length} onCopySuccess={onMetaFieldCopied} />
        </>
      )}
    />
  </Panel>
);
