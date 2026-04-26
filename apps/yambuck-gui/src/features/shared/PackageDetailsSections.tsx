import type { ComponentChildren } from "preact";
import { SectionToggleButton } from "../../components/ui/SectionToggleButton";
import { appText } from "../../i18n/app";
import type { PackageInfo } from "../../types/app";
import { truncateDescription } from "../../utils/text";
import {
  longDescriptionCard,
  longDescriptionSection,
  metaSection,
  metaSectionHeader,
  packageDescription,
  packageIcon,
  packageIconPlaceholder,
  packageOverview,
  screenshotStrip,
  screenshotTile,
  subtitle,
  technicalSection,
  technicalToggleOnly,
} from "./packageUi.css";
import { MetaCardGrid } from "./MetaCardGrid";

type PackageDetailsSectionsProps = {
  packageInfo: PackageInfo;
  showTechnicalDetails: boolean;
  onToggleTechnicalDetails: () => void;
  onOpenScreenshot: (gallery: string[], index: number) => void;
  appDetailsContent: ComponentChildren;
  technicalDetailsContent: ComponentChildren;
  overviewClassName?: string;
  longDescriptionClassName?: string;
};

export const PackageDetailsSections = ({
  packageInfo,
  showTechnicalDetails,
  onToggleTechnicalDetails,
  onOpenScreenshot,
  appDetailsContent,
  technicalDetailsContent,
  overviewClassName,
  longDescriptionClassName,
}: PackageDetailsSectionsProps) => (
  <>
    <div class={`package-overview ${packageOverview}${overviewClassName ? ` ${overviewClassName}` : ""}`}>
      {packageInfo.iconDataUrl ? (
        <img
          class={`package-icon ${packageIcon}`}
          src={packageInfo.iconDataUrl}
          alt={appText("package.iconAlt", { appName: packageInfo.displayName })}
        />
      ) : (
        <div class={`package-icon placeholder ${packageIcon} ${packageIconPlaceholder}`}>{appText("package.noIcon")}</div>
      )}
      <div>
        <p class={`subtitle package-description ${subtitle} ${packageDescription}`}>{truncateDescription(packageInfo.description)}</p>
      </div>
    </div>

    {packageInfo.screenshotDataUrls.length > 0 ? (
      <div class={`screenshot-strip ${screenshotStrip}`} data-no-drag="true">
        {packageInfo.screenshotDataUrls.map((source, index) => (
          <button
            key={`${packageInfo.packageUuid}-${index}`}
            class={`screenshot-tile ${screenshotTile}`}
            onClick={() => onOpenScreenshot(packageInfo.screenshotDataUrls, index)}
            title={appText("package.screenshot.open", { index: index + 1 })}
          >
            <img src={source} alt={appText("package.screenshot.alt", { index: index + 1 })} />
          </button>
        ))}
      </div>
    ) : null}

    <section class={`meta-section ${metaSection}`}>
      <div class={`meta-section-header ${metaSectionHeader}`}>
        <h2>{appText("package.sections.appDetails")}</h2>
      </div>
      <MetaCardGrid>{appDetailsContent}</MetaCardGrid>
    </section>

    <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
      <div class={`meta-section-header technical-toggle-only ${metaSectionHeader} ${technicalToggleOnly}`}>
        <SectionToggleButton
          expanded={showTechnicalDetails}
          onToggle={onToggleTechnicalDetails}
          showLabel={appText("package.technical.show")}
          hideLabel={appText("package.technical.hide")}
          controlsId="package-technical-details"
        />
      </div>
      {showTechnicalDetails ? <MetaCardGrid id="package-technical-details">{technicalDetailsContent}</MetaCardGrid> : null}
    </section>

    {packageInfo.longDescription?.trim() ? (
      <section class={`meta-section long-description ${metaSection} ${longDescriptionSection}${longDescriptionClassName ? ` ${longDescriptionClassName}` : ""}`}>
        <div class={`meta-section-header ${metaSectionHeader}`}>
          <h2>{appText("package.sections.about")}</h2>
        </div>
        <div class={`long-description-card ${longDescriptionCard}`}>
          <p>{packageInfo.longDescription}</p>
        </div>
      </section>
    ) : null}
  </>
);
