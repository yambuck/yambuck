import { CardCloseButton } from "../../CardCloseButton";
import { Button } from "../../components/ui/Button";
import { MetaField } from "../../components/ui/MetaField";
import { inlineActions, licenseActions, licenseLabel, link } from "../../components/ui/metaField.css";
import { Panel } from "../../components/ui/Panel";
import {
  detailsActions,
  detailsHeader,
  longDescriptionCard,
  longDescriptionSection,
  metaGrid,
  metaSection,
  metaSectionHeader,
  metaToggle,
  packageDescription,
  packageIcon,
  packageOverview,
  packagePanel,
  screenshotStrip,
  screenshotTile,
  subtitle,
  technicalSection,
  technicalToggleOnly,
} from "../shared/packageUi.css";
import { truncateDescription } from "../../utils/text";

const MOCK_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="22" fill="#0e2b43"/><circle cx="64" cy="50" r="24" fill="#63d8ff"/><rect x="28" y="82" width="72" height="16" rx="8" fill="#5bf0c5"/></svg>',
  );

const MOCK_SHOT_A =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600" viewBox="0 0 900 1600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#123e63"/><stop offset="1" stop-color="#09172a"/></linearGradient></defs><rect width="900" height="1600" fill="url(#g)"/><rect x="70" y="120" width="760" height="220" rx="22" fill="#1a527f"/><rect x="70" y="390" width="760" height="900" rx="22" fill="#113452"/><rect x="100" y="440" width="700" height="54" rx="10" fill="#5ee7c2"/><rect x="100" y="530" width="700" height="54" rx="10" fill="#4bb9ff"/></svg>',
  );

const MOCK_SHOT_B =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1700" viewBox="0 0 1000 1700"><rect width="1000" height="1700" fill="#0a1f33"/><rect x="90" y="110" width="820" height="220" rx="20" fill="#194767"/><rect x="90" y="380" width="820" height="1180" rx="20" fill="#0f2d47"/><circle cx="180" cy="200" r="42" fill="#63d8ff"/><rect x="250" y="170" width="560" height="54" rx="12" fill="#5bf0c5"/><rect x="250" y="244" width="420" height="36" rx="10" fill="#88c9f8"/></svg>',
  );

const MOCK_SHOT_C =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1600" viewBox="0 0 960 1600"><rect width="960" height="1600" fill="#09192a"/><rect x="60" y="110" width="840" height="190" rx="18" fill="#1b4f75"/><rect x="60" y="340" width="840" height="1180" rx="18" fill="#10314c"/><rect x="100" y="400" width="760" height="70" rx="12" fill="#63d8ff"/><rect x="100" y="500" width="620" height="40" rx="10" fill="#7abef0"/><rect x="100" y="570" width="710" height="40" rx="10" fill="#5be7bf"/></svg>',
  );

const MOCK_SHOT_D =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="980" height="1640" viewBox="0 0 980 1640"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123758"/><stop offset="1" stop-color="#081423"/></linearGradient></defs><rect width="980" height="1640" fill="url(#bg)"/><rect x="72" y="120" width="836" height="240" rx="20" fill="#1b4e72"/><rect x="72" y="400" width="836" height="1130" rx="20" fill="#0f2d46"/><circle cx="160" cy="240" r="38" fill="#5be7bf"/><rect x="230" y="210" width="610" height="48" rx="12" fill="#63d8ff"/><rect x="230" y="276" width="460" height="34" rx="10" fill="#8ec8ee"/></svg>',
  );

const MOCK_SHOT_E =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="940" height="1580" viewBox="0 0 940 1580"><rect width="940" height="1580" fill="#0a2034"/><rect x="64" y="104" width="812" height="210" rx="18" fill="#1a4a70"/><rect x="64" y="350" width="812" height="1166" rx="18" fill="#113450"/><rect x="94" y="420" width="752" height="52" rx="10" fill="#7bd4ff"/><rect x="94" y="498" width="752" height="52" rx="10" fill="#5be7bf"/><rect x="94" y="576" width="520" height="36" rx="10" fill="#8ec8ee"/></svg>',
  );

const MOCK_SHOT_F =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1620" viewBox="0 0 960 1620"><rect width="960" height="1620" fill="#081a2b"/><rect x="72" y="112" width="816" height="212" rx="18" fill="#1d537b"/><rect x="72" y="360" width="816" height="1188" rx="18" fill="#123753"/><rect x="110" y="428" width="740" height="58" rx="10" fill="#63d8ff"/><rect x="110" y="510" width="740" height="58" rx="10" fill="#5be7bf"/><rect x="110" y="592" width="620" height="40" rx="10" fill="#8ec8ee"/></svg>',
  );

type MockPreviewPageProps = {
  showMockTechnicalDetails: boolean;
  onToggleTechnicalDetails: () => void;
  onOpenScreenshot: (gallery: string[], index: number) => void;
  onOpenLicense: (title: string, text: string) => void;
  onBackToSettings: () => void;
  onStartInstallFlow: () => void;
  onMetaFieldCopied: (label: string) => void;
};

export const MockPreviewPage = ({
  showMockTechnicalDetails,
  onToggleTechnicalDetails,
  onOpenScreenshot,
  onOpenLicense,
  onBackToSettings,
  onStartInstallFlow,
  onMetaFieldCopied,
}: MockPreviewPageProps) => {
  const mockName = "Voquill (Mock Preview)";
  const mockVersion = "1.4.0";
  const mockManifestVersion = "1.0.0";
  const mockAppId = "com.voquill.app";
  const mockAppUuid = "6b61815c-66c5-4cc6-85ba-ec0736ecef4c";
  const mockPackageUuid = "7f2f2d3e-2662-4d8c-a4ae-05f14de8f8c6";
  const mockPublisher = "Voquill Project";
  const mockHomepage = "https://voquill.org";
  const mockSupport = "https://github.com/voquill/voquill";
  const mockLicense = "MIT";
  const mockLicenseText =
    "Example License\n\n" +
    "Section 1 - Permission\n" +
    "Permission is granted to install and evaluate this example package for QA and UI behavior validation.\n\n" +
    "Section 2 - Scope\n" +
    "This package is for demonstration and testing only. It is not intended for production use and may include mock metadata or simulated behaviors.\n\n" +
    "Section 3 - Redistribution\n" +
    "Internal redistribution is allowed for testing, provided this license text remains intact.\n\n" +
    "Section 4 - Support\n" +
    "Support is best effort. Include platform details, logs, and exact reproduction steps when reporting issues.\n\n" +
    "Section 5 - Warranty\n" +
    "THE SOFTWARE IS PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.\n\n" +
    "Section 6 - Extended Content\n" +
    "This section is intentionally verbose so the license modal can be tested with long-form scrolling content.\n\n" +
    "Example clause paragraph A: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph B: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph C: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph D: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph E: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph F: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph G: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph H: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph I: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph J: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph K: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "Example clause paragraph L: This example license paragraph is intentionally long and repetitive to ensure vertical overflow and scrolling behavior can be validated in a realistic way.\n\n" +
    "End of Example License.";
  const mockTrust = "unverified";
  const mockDescription =
    "Mock package view for rapid UI iteration. Use this screen to tweak spacing, screenshots, metadata layout, and card actions with HMR while validating how dense package metadata reads inside a compact panel before the installer flow continues. This sentence intentionally extends well beyond normal copy length to simulate a package summary that pushes the short-description limit and demonstrates truncation behavior for at-a-glance review during install.";
  const mockLongDescription =
    "Voquill is designed for people who think faster than they type. It combines low-latency speech capture with keyboard-first editing so you can dictate rough drafts and refine them without leaving your normal workflow.\n\nIn this mock package, the long description is plain text and supports paragraph breaks. Developers can use this area for onboarding context, compatibility notes, expected hardware behavior, and any caveats that do not belong in the one-line summary.\n\nFor final packaging, keep the short summary fast to scan and reserve this section for deeper detail that helps users decide whether to trust and install the app.\n\nTeams distributing private builds can also use this space to explain deployment constraints, required environment variables, and support expectations before a user clicks Install.\n\nIf your app integrates with microphones, cameras, or hardware accelerators, call those requirements out here so users can assess compatibility in advance and avoid surprise runtime errors.";
  const mockShots = [MOCK_SHOT_A, MOCK_SHOT_B, MOCK_SHOT_C, MOCK_SHOT_D, MOCK_SHOT_E, MOCK_SHOT_F];

  return (
    <Panel class={`package-panel ${packagePanel}`}>
      <div class={`details-header ${detailsHeader}`}>
        <div>
          <h1>{mockName}</h1>
          <p class={`subtitle ${subtitle}`}>Mock Preview (Debug)</p>
        </div>
        <div class={`details-actions ${detailsActions}`} data-no-drag="true">
          <Button variant="primary" onClick={onStartInstallFlow}>Install</Button>
        </div>
      </div>

      <CardCloseButton title="Back to debug" onClick={onBackToSettings} />

      <div class={`package-overview ${packageOverview}`}>
        <img class={`package-icon ${packageIcon}`} src={MOCK_ICON} alt="Mock app icon" />
        <div>
          <p class={`subtitle package-description ${subtitle} ${packageDescription}`}>{truncateDescription(mockDescription)}</p>
        </div>
      </div>

      <div class={`screenshot-strip ${screenshotStrip}`} data-no-drag="true">
        {mockShots.map((source, index) => (
          <button
            key={`mock-shot-${index}`}
            class={`screenshot-tile ${screenshotTile}`}
            onClick={() => onOpenScreenshot(mockShots, index)}
            title={`Open screenshot ${index + 1}`}
          >
            <img src={source} alt={`Mock screenshot ${index + 1}`} />
          </button>
        ))}
      </div>

      <section class={`meta-section ${metaSection}`}>
        <div class={`meta-section-header ${metaSectionHeader}`}>
          <h2>App details</h2>
        </div>
        <dl class={`meta-grid ${metaGrid}`}>
          <MetaField label="Publisher" tooltip="The team or company that published this app." value={mockPublisher} onCopySuccess={onMetaFieldCopied} />
          <MetaField label="Version" tooltip="The app version that will be installed." value={mockVersion} onCopySuccess={onMetaFieldCopied} />
          <MetaField
            label="Homepage"
            tooltip="The app's official website for product information."
            copyValue={mockHomepage}
            onCopySuccess={onMetaFieldCopied}
            value={<a class={`meta-link ${link}`} href={mockHomepage} target="_blank" rel="noreferrer">{mockHomepage}</a>}
          />
          <MetaField
            label="Support"
            tooltip="Where to get help, report bugs, or contact maintainers."
            copyValue={mockSupport}
            onCopySuccess={onMetaFieldCopied}
            value={<a class={`meta-link ${link}`} href={mockSupport} target="_blank" rel="noreferrer">{mockSupport}</a>}
          />
          <MetaField
            label="License"
            tooltip="The legal terms for using this app."
            onCopySuccess={onMetaFieldCopied}
            value={(
              <span class={`meta-inline-actions ${inlineActions} license-actions ${licenseActions}`}>
                <span class={`license-action-label ${licenseLabel}`}>{mockLicense}</span>
                <Button
                  size="inline"
                  onClick={() => onOpenLicense("Example License", mockLicenseText)}
                >
                  View license
                </Button>
              </span>
            )}
          />
          <MetaField
            label="Trust"
            tooltip="Whether Yambuck could verify the package publisher signature."
            value={mockTrust}
            onCopySuccess={onMetaFieldCopied}
          />
        </dl>
      </section>

      <section class={`meta-section technical ${metaSection} ${technicalSection}`}>
        <div class={`meta-section-header technical-toggle-only ${metaSectionHeader} ${technicalToggleOnly}`}>
          <button class={`meta-toggle ${metaToggle}`} type="button" onClick={onToggleTechnicalDetails}>
            {showMockTechnicalDetails ? "Hide technical details" : "Show technical details"}
          </button>
        </div>
        {showMockTechnicalDetails ? (
          <dl class={`meta-grid ${metaGrid}`}>
            <MetaField label="Package" tooltip="The package file name selected for this install." value="voquill-mock.yambuck" onCopySuccess={onMetaFieldCopied} />
            <MetaField label="Manifest" tooltip="The manifest schema version this package was built with." value={mockManifestVersion} onCopySuccess={onMetaFieldCopied} />
            <MetaField label="App ID" tooltip="A stable identifier Yambuck uses for updates and app tracking." value={mockAppId} onCopySuccess={onMetaFieldCopied} />
            <MetaField
              label="Entrypoint"
              tooltip="The internal command Yambuck uses to launch the installed app."
              copyValue="app/bin/voquill"
              onCopySuccess={onMetaFieldCopied}
              value={<code>app/bin/voquill</code>}
            />
            <MetaField label="App UUID" tooltip="The immutable app identity UUID declared by the publisher." value={mockAppUuid} onCopySuccess={onMetaFieldCopied} />
            <MetaField label="Package UUID" tooltip="The unique UUID assigned to this specific package build." value={mockPackageUuid} onCopySuccess={onMetaFieldCopied} />
          </dl>
        ) : null}
      </section>

      <section class={`meta-section long-description ${metaSection} ${longDescriptionSection}`}>
        <div class={`meta-section-header ${metaSectionHeader}`}>
          <h2>About this app</h2>
        </div>
        <div class={`long-description-card ${longDescriptionCard}`}>
          <p>{mockLongDescription}</p>
        </div>
      </section>
    </Panel>
  );
};
