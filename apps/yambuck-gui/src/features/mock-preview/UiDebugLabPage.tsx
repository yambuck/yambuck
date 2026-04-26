import { useState } from "preact/hooks";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { MessagePanel } from "../../components/ui/MessagePanel";
import { MetaField } from "../../components/ui/MetaField";
import { ModalShell } from "../../components/ui/ModalShell";
import { Panel } from "../../components/ui/Panel";
import { PanelHeader } from "../../components/ui/PanelHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { ScopeChoiceCards } from "../../components/ui/ScopeChoiceCards";
import { SectionToggleButton } from "../../components/ui/SectionToggleButton";
import { SelectField } from "../../components/ui/SelectField";
import { TableRowAction } from "../../components/ui/TableRowAction";
import { TextField } from "../../components/ui/TextField";
import { TogglePillGroup } from "../../components/ui/TogglePillGroup";
import { WizardStepper } from "../../components/ui/WizardStepper";
import { appText } from "../../i18n/app";
import { installerText } from "../../i18n/installer";
import { MetaCardGrid } from "../shared/MetaCardGrid";
import {
  fieldWrap,
  listRowPreview,
  listRowSubtitle,
  listRowTitle,
  modalPreviewActions,
  modalPreviewBody,
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
  { value: "compact", label: appText("debugLab.forms.densityCompact") },
  { value: "balanced", label: appText("debugLab.forms.densityBalanced") },
  { value: "comfortable", label: appText("debugLab.forms.densityComfortable") },
];

const scopeChoices = [
  {
    value: "user",
    title: installerText("scope.user.title"),
    description: installerText("scope.user.description"),
  },
  {
    value: "system",
    title: installerText("scope.system.title"),
    description: installerText("scope.system.description"),
  },
];

const installerSteps = [
  { id: "details", label: installerText("step.details") },
  { id: "trust", label: installerText("step.trust") },
  { id: "license", label: installerText("step.license") },
  { id: "options", label: installerText("step.options") },
  { id: "scope", label: installerText("step.scope") },
  { id: "progress", label: installerText("step.progress") },
  { id: "complete", label: installerText("step.complete") },
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
  const [showModalPreview, setShowModalPreview] = useState(false);

  return (
    <Panel showCornerClose cornerCloseTitle={appText("debugLab.back")} onCornerClose={onBackToSettingsDebug}>
      <PanelHeader title={appText("debugLab.title")}>{appText("debugLab.subtitle")}</PanelHeader>

      <div class={stack}>
        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.buttons.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.buttons.body")}</p>
          <div class={row}>
            <Button onClick={() => onToast("success", appText("debugLab.buttons.toastPrimary"))} variant="primary">{appText("debugLab.buttons.primary")}</Button>
            <Button onClick={() => onToast("info", appText("debugLab.buttons.toastGhost"))}>{appText("debugLab.buttons.ghost")}</Button>
            <Button onClick={() => onToast("warning", appText("debugLab.buttons.toastDanger"))} variant="danger">{appText("debugLab.buttons.danger")}</Button>
            <Button disabled>{appText("debugLab.buttons.disabled")}</Button>
            <Button onClick={() => setShowModalPreview(true)}>{appText("debugLab.buttons.modalPreview")}</Button>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.nav.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.nav.body")}</p>
          <div class={toggleGroupShell}>
            <TogglePillGroup
              class={row}
              behavior="tabs"
              ariaLabel={appText("debugLab.nav.aria")}
              items={[
                {
                  id: "overview",
                  label: appText("debugLab.nav.overview"),
                  active: activeTab === "overview",
                  onSelect: () => setActiveTab("overview"),
                },
                {
                  id: "advanced",
                  label: appText("debugLab.nav.advanced"),
                  active: activeTab === "advanced",
                  onSelect: () => setActiveTab("advanced"),
                },
              ]}
            />
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.forms.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.forms.body")}</p>
          <div class={row}>
            <div class={fieldWrap}>
              <TextField
                value={searchQuery}
                placeholder={appText("debugLab.forms.searchPlaceholder")}
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
              {appText("debugLab.forms.showTechnical")}
            </CheckboxField>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.messages.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.messages.body")}</p>
          <div class={stack}>
            <MessagePanel tone="info" title={appText("debugLab.messages.info")}>{appText("debugLab.messages.infoBody")}</MessagePanel>
            <MessagePanel tone="success" title={appText("debugLab.messages.success")}>{appText("debugLab.messages.successBody")}</MessagePanel>
            <MessagePanel tone="warning" title={appText("debugLab.messages.warning")}>{appText("debugLab.messages.warningBody")}</MessagePanel>
            <MessagePanel tone="error" title={appText("debugLab.messages.error")}>{appText("debugLab.messages.errorBody")}</MessagePanel>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.sectionToggle.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.sectionToggle.body")}</p>
          <SectionToggleButton
            expanded={showAdvancedCard}
            onToggle={() => setShowAdvancedCard((value) => !value)}
            showLabel={appText("package.technical.show")}
            hideLabel={appText("package.technical.hide")}
            controlsId="debug-lab-expanded-preview"
          />
          {showAdvancedCard ? (
            <div id="debug-lab-expanded-preview">
              <MessagePanel tone="info" title={appText("debugLab.sectionToggle.expanded")} class={sectionTogglePreview}>
                {appText("debugLab.sectionToggle.expandedBody")}
              </MessagePanel>
            </div>
          ) : null}
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.progress.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.progress.body")}</p>
          <ProgressBar value={progress} class={progressPreview} ariaLabel={appText("debugLab.progress.aria")} />
          <div class={progressActions}>
            <Button onClick={() => setProgress(0)}>0%</Button>
            <Button onClick={() => setProgress(25)}>25%</Button>
            <Button onClick={() => setProgress(50)}>50%</Button>
            <Button onClick={() => setProgress(75)}>75%</Button>
            <Button onClick={() => setProgress(100)}>100%</Button>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.stepper.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.stepper.body")}</p>
          <WizardStepper steps={installerSteps} currentStepId={activeInstallerStep} align="center" />
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
          <h2 class={sectionTitle}>{appText("debugLab.scope.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.scope.body")}</p>
          <ScopeChoiceCards
            value={installScope}
            options={scopeChoices}
            onValueChange={setInstallScope}
            name="ui-debug-scope"
            ariaLabel={appText("debugLab.scope.aria")}
            class={scopeChoicePreview}
          />
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.list.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.list.body")}</p>
          <div class={listRowPreview}>
            <div>
              <div class={listRowTitle}>{appText("debugLab.list.exampleName")}</div>
              <div class={listRowSubtitle}>com.example.app</div>
            </div>
            <TableRowAction />
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.toasts.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.toasts.body")}</p>
          <div class={toastRow}>
            <Button onClick={() => onToast("info", appText("debugLab.toasts.info"))}>{appText("debugLab.toasts.showInfo")}</Button>
            <Button onClick={() => onToast("success", appText("debugLab.toasts.success"))}>{appText("debugLab.toasts.showSuccess")}</Button>
            <Button onClick={() => onToast("warning", appText("debugLab.toasts.warning"))}>{appText("debugLab.toasts.showWarning")}</Button>
            <Button onClick={() => onToast("error", appText("debugLab.toasts.error"))}>{appText("debugLab.toasts.showError")}</Button>
          </div>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.meta.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.meta.body")}</p>
          <MetaCardGrid>
              <MetaField
                label={appText("debugLab.meta.currentQuery")}
                tooltip={appText("debugLab.meta.currentQueryTip")}
                value={searchQuery || appText("debugLab.meta.empty")}
                copyValue={searchQuery}
                onCopySuccess={(label) => onToast("info", appText("toast.metaCopied", { label }))}
              />
              <MetaField
                label={appText("debugLab.meta.density")}
                tooltip={appText("debugLab.meta.densityTip")}
                value={layoutDensity}
                onCopySuccess={(label) => onToast("info", appText("toast.metaCopied", { label }))}
              />
              <MetaField
                label={appText("debugLab.meta.technical")}
                tooltip={appText("debugLab.meta.technicalTip")}
                value={showTechnicalMetadata ? appText("debugLab.meta.visible") : appText("debugLab.meta.hidden")}
                onCopySuccess={(label) => onToast("info", appText("toast.metaCopied", { label }))}
              />
          </MetaCardGrid>
        </section>

        <section class={section}>
          <h2 class={sectionTitle}>{appText("debugLab.techCards.title")}</h2>
          <p class={sectionDescription}>{appText("debugLab.techCards.body")}</p>
          <MetaCardGrid class={technicalCardsPreview}>
            <MetaField
              label={appText("meta.appId.label")}
              tooltip={appText("debugLab.techCards.appIdTip")}
              value="com.example.app"
              onCopySuccess={(label) => onToast("info", appText("toast.metaCopied", { label }))}
            />
            <MetaField
              label={appText("meta.appUuid.label")}
              tooltip={appText("debugLab.techCards.appUuidTip")}
              value="6b61815c-66c5-4cc6-85ba-ec0736ecef4c"
              onCopySuccess={(label) => onToast("info", appText("toast.metaCopied", { label }))}
            />
            <MetaField
              label={appText("meta.entrypoint.label")}
              tooltip={appText("debugLab.techCards.entrypointTip")}
              copyValue="app/bin/example-app"
              value={<code>app/bin/example-app</code>}
              onCopySuccess={(label) => onToast("info", appText("toast.metaCopied", { label }))}
            />
            <MetaField
              label={appText("debugLab.techCards.installPath")}
              tooltip={appText("debugLab.techCards.installPathTip")}
              copyValue="~/.local/share/yambuck/apps/com.example.app"
              value={<code>~/.local/share/yambuck/apps/com.example.app</code>}
              onCopySuccess={(label) => onToast("info", appText("toast.metaCopied", { label }))}
            />
          </MetaCardGrid>
        </section>
      </div>

      {showModalPreview ? (
        <ModalShell onClose={() => setShowModalPreview(false)} closeTitle={appText("debugLab.modal.close")}> 
          <section class={modalPreviewBody}>
            <h2>{appText("debugLab.modal.title")}</h2>
            <p>{appText("debugLab.modal.body")}</p>
            <MessagePanel tone="info" title={appText("debugLab.modal.messageTitle")}>{appText("debugLab.modal.messageBody")}</MessagePanel>
            <div class={modalPreviewActions}>
              <Button onClick={() => setShowModalPreview(false)}>{appText("debugLab.modal.dismiss")}</Button>
              <Button variant="primary" onClick={() => onToast("success", appText("debugLab.modal.toast"))}>{appText("debugLab.modal.primary")}</Button>
            </div>
          </section>
        </ModalShell>
      ) : null}
    </Panel>
  );
};
