import { useState } from "preact/hooks";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { MessagePanel } from "../../components/ui/MessagePanel";
import { MetaField } from "../../components/ui/MetaField";
import { Panel } from "../../components/ui/Panel";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { ScopeChoiceCards } from "../../components/ui/ScopeChoiceCards";
import { SectionToggleButton } from "../../components/ui/SectionToggleButton";
import { SelectField } from "../../components/ui/SelectField";
import { TableRowAction } from "../../components/ui/TableRowAction";
import { TextField } from "../../components/ui/TextField";
import { TogglePillGroup } from "../../components/ui/TogglePillGroup";
import { WizardStepper } from "../../components/ui/WizardStepper";
import { MetaCardGrid } from "../shared/MetaCardGrid";
import {
  fieldWrap,
  listRowPreview,
  listRowSubtitle,
  listRowTitle,
  progressActions,
  progressPreview,
  row,
  section,
  sectionDescription,
  sectionTogglePreview,
  sectionTitle,
  scopeChoicePreview,
  stepperPreview,
  toggleGroupShell,
  stack,
  technicalCardsPreview,
  toastRow,
} from "./uiDebugLabPage.css";

type UiDebugLabPageProps = {
  onBackToSettingsDebug: () => void;
  onToast: (kind: "info" | "success" | "warning" | "error", message: string) => void;
};

const densityOptions = [
  { value: "compact", label: "Compact" },
  { value: "balanced", label: "Balanced" },
  { value: "comfortable", label: "Comfortable" },
];

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

const installerSteps = [
  { id: "details", label: "Details" },
  { id: "trust", label: "Trust" },
  { id: "license", label: "License" },
  { id: "options", label: "Options" },
  { id: "scope", label: "Scope" },
  { id: "progress", label: "Install" },
  { id: "complete", label: "Done" },
];

const installerStepOptions = installerSteps.map((step) => ({ value: step.id, label: step.label }));

export const UiDebugLabPage = ({ onBackToSettingsDebug, onToast }: UiDebugLabPageProps) => {
  const [searchQuery, setSearchQuery] = useState("Voice notes");
  const [layoutDensity, setLayoutDensity] = useState("balanced");
  const [showTechnicalMetadata, setShowTechnicalMetadata] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAdvancedCard, setShowAdvancedCard] = useState(false);
  const [progress, setProgress] = useState(42);
  const [installScope, setInstallScope] = useState("user");
  const [activeInstallerStep, setActiveInstallerStep] = useState("options");

  return (
    <Panel showCornerClose cornerCloseTitle="Back to debug" onCornerClose={onBackToSettingsDebug}>
      <h1>UI Debugging Lab</h1>
      <p>
        Interactive component gallery for fast HMR styling checks. Use this page to tune spacing,
        typography, and state visuals without running installer flows.
      </p>

      <div class={stack}>
        <section class={section}>
          <h2 class={sectionTitle}>Buttons</h2>
          <p class={sectionDescription}>Check variant and disabled states.</p>
          <div class={row}>
            <Button onClick={() => onToast("success", "Primary button action fired.")} variant="primary">Primary</Button>
            <Button onClick={() => onToast("info", "Ghost button action fired.")}>Ghost</Button>
            <Button onClick={() => onToast("warning", "Danger button action fired.")} variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Navigation Toggles</h2>
          <p class={sectionDescription}>Preview segmented tab/toggle states used in the top bar and settings.</p>
          <div class={toggleGroupShell}>
            <TogglePillGroup
              class={row}
              behavior="tabs"
              ariaLabel="Debug lab tabs"
              items={[
                {
                  id: "overview",
                  label: "Overview",
                  active: activeTab === "overview",
                  onSelect: () => setActiveTab("overview"),
                },
                {
                  id: "advanced",
                  label: "Advanced",
                  active: activeTab === "advanced",
                  onSelect: () => setActiveTab("advanced"),
                },
              ]}
            />
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Form Controls</h2>
          <p class={sectionDescription}>Preview field alignment and interaction behavior in one place.</p>
          <div class={row}>
            <div class={fieldWrap}>
              <TextField
                value={searchQuery}
                placeholder="Search mock apps"
                onInput={setSearchQuery}
                type="search"
              />
            </div>
            <div class={fieldWrap}>
              <SelectField
                value={layoutDensity}
                onValueChange={setLayoutDensity}
                options={densityOptions}
                name="ui-density"
              />
            </div>
            <CheckboxField
              checked={showTechnicalMetadata}
              onChange={setShowTechnicalMetadata}
            >
              Show technical metadata
            </CheckboxField>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Message Panels</h2>
          <p class={sectionDescription}>Validate semantic tones and text contrast at a glance.</p>
          <div class={stack}>
            <MessagePanel tone="info" title="Info">Background checks are running.</MessagePanel>
            <MessagePanel tone="success" title="Success">Install plan validated and ready.</MessagePanel>
            <MessagePanel tone="warning" title="Warning">Desktop session details are incomplete.</MessagePanel>
            <MessagePanel tone="error" title="Error">Package validation failed in mock mode.</MessagePanel>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Section Toggle</h2>
          <p class={sectionDescription}>Used for technical details sections in package/review pages.</p>
          <SectionToggleButton
            expanded={showAdvancedCard}
            onToggle={() => setShowAdvancedCard((value) => !value)}
            showLabel="Show technical details"
            hideLabel="Hide technical details"
            controlsId="debug-lab-expanded-preview"
          />
          {showAdvancedCard ? (
            <div id="debug-lab-expanded-preview">
              <MessagePanel tone="info" title="Expanded" class={sectionTogglePreview}>
                Advanced content is visible. Collapse to test the default state.
              </MessagePanel>
            </div>
          ) : null}
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Progress</h2>
          <p class={sectionDescription}>Replicates installer progress visuals and value states.</p>
          <ProgressBar value={progress} class={progressPreview} ariaLabel="Debug progress preview" />
          <div class={progressActions}>
            <Button onClick={() => setProgress(0)}>0%</Button>
            <Button onClick={() => setProgress(25)}>25%</Button>
            <Button onClick={() => setProgress(50)}>50%</Button>
            <Button onClick={() => setProgress(75)}>75%</Button>
            <Button onClick={() => setProgress(100)}>100%</Button>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Installer Stepper</h2>
          <p class={sectionDescription}>Matches the step-by-step orientation used across installer states.</p>
          <WizardStepper steps={installerSteps} currentStepId={activeInstallerStep} />
          <div class={stepperPreview}>
            <SelectField
              value={activeInstallerStep}
              onValueChange={setActiveInstallerStep}
              options={installerStepOptions}
              name="debug-installer-step"
            />
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Scope Choice Cards</h2>
          <p class={sectionDescription}>Matches the install scope selector card component.</p>
          <ScopeChoiceCards
            value={installScope}
            options={scopeChoices}
            onValueChange={setInstallScope}
            name="ui-debug-scope"
            ariaLabel="Debug install scope"
            class={scopeChoicePreview}
          />
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>List Row Affordance</h2>
          <p class={sectionDescription}>Preview the chevron-style row affordance used in Installed Apps.</p>
          <div class={listRowPreview}>
            <div>
              <div class={listRowTitle}>Voquill</div>
              <div class={listRowSubtitle}>com.voquill.app</div>
            </div>
            <TableRowAction />
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Toast Triggers</h2>
          <p class={sectionDescription}>Fire each toast tone so notification styling can be tuned in context.</p>
          <div class={toastRow}>
            <Button onClick={() => onToast("info", "Info toast from UI Debugging Lab.")}>Show info toast</Button>
            <Button onClick={() => onToast("success", "Success toast from UI Debugging Lab.")}>Show success toast</Button>
            <Button onClick={() => onToast("warning", "Warning toast from UI Debugging Lab.")}>Show warning toast</Button>
            <Button onClick={() => onToast("error", "Error toast from UI Debugging Lab.")}>Show error toast</Button>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Metadata Fields</h2>
          <p class={sectionDescription}>Exercise copy affordances and long-value wrapping.</p>
          <MetaCardGrid>
              <MetaField
                label="Current Query"
                tooltip="Current value from the search field above."
                value={searchQuery || "(empty)"}
                copyValue={searchQuery}
                onCopySuccess={(label) => onToast("info", `${label} copied to clipboard.`)}
              />
              <MetaField
                label="Density"
                tooltip="Current selected layout density for this debug page."
                value={layoutDensity}
                onCopySuccess={(label) => onToast("info", `${label} copied to clipboard.`)}
              />
              <MetaField
                label="Technical Details"
                tooltip="Whether technical metadata rows are visible during this preview session."
                value={showTechnicalMetadata ? "visible" : "hidden"}
                onCopySuccess={(label) => onToast("info", `${label} copied to clipboard.`)}
              />
          </MetaCardGrid>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>Technical Detail Cards</h2>
          <p class={sectionDescription}>Simulates the package details grid used across install and review flows.</p>
          <MetaCardGrid class={technicalCardsPreview}>
            <div>
              <MetaField
                label="App ID"
                tooltip="Stable app identifier used for ownership and updates."
                value="com.voquill.app"
                onCopySuccess={(label) => onToast("info", `${label} copied to clipboard.`)}
              />
            </div>
            <div>
              <MetaField
                label="App UUID"
                tooltip="Immutable app identity UUID declared by the publisher."
                value="6b61815c-66c5-4cc6-85ba-ec0736ecef4c"
                onCopySuccess={(label) => onToast("info", `${label} copied to clipboard.`)}
              />
            </div>
            <div>
              <MetaField
                label="Entrypoint"
                tooltip="Launch command path from package metadata."
                copyValue="app/bin/voquill"
                value={<code>app/bin/voquill</code>}
                onCopySuccess={(label) => onToast("info", `${label} copied to clipboard.`)}
              />
            </div>
            <div>
              <MetaField
                label="Install Path"
                tooltip="Destination path where package payload is installed."
                copyValue="~/.local/share/yambuck/apps/com.voquill.app"
                value={<code>~/.local/share/yambuck/apps/com.voquill.app</code>}
                onCopySuccess={(label) => onToast("info", `${label} copied to clipboard.`)}
              />
            </div>
          </MetaCardGrid>
        </section>
      </div>
    </Panel>
  );
};
