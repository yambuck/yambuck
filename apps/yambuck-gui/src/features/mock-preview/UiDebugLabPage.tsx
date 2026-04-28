import { useEffect, useMemo, useState } from "preact/hooks";
import { Button } from "../../components/ui/Button";
import { AccordionRow } from "../../components/ui/AccordionRow";
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
import {
  buildTargetIdList,
  collectBuilderValidation,
  linuxDesktopListForTarget,
  payloadRootForTarget,
  sanitizeTargetSegment,
} from "../package-builder/builderValidation";
import {
  builderSteps,
  createBuilderTargetEditorId,
  type BuilderFormState,
  type BuilderStep,
  type BuilderTarget,
} from "../package-builder/builderTypes";
import { BuilderManifestPreviewModal } from "../package-builder/components/BuilderManifestPreviewModal";
import { BuilderSaveChecklistModal } from "../package-builder/components/BuilderSaveChecklistModal";
import { BuilderStepStatusNav } from "../package-builder/components/BuilderStepStatusNav";
import { BuilderTargetCard } from "../package-builder/components/BuilderTargetCard";
import { MetaCardGrid } from "../shared/MetaCardGrid";
import {
  actionBar,
  editorCard,
  targetDuplicateWarning,
  targetList,
  targetListActions,
  targetValidationList,
  wizardFooter,
  wizardFooterActions,
  workspace,
} from "../package-builder/packageBuilderPage.css";
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

const defaultDebugBuilderForm = (): BuilderFormState => ({
  appId: "com.example.preview",
  appUuid: "123e4567-e89b-12d3-a456-426614174000",
  packageUuid: "123e4567-e89b-12d3-a456-426614174001",
  displayName: "Debug Builder App",
  description: "Short summary shown in installer preview.",
  longDescription: "Longer description shown in installer details.",
  version: "1.2.0",
  publisher: "Yambuck Labs",
  homepageUrl: "https://example.com",
  supportUrl: "https://example.com/support",
  license: "MIT",
  licenseFile: "assets/licenses/LICENSE.txt",
  requiresLicenseAcceptance: false,
  hasGui: true,
  hasCli: true,
  commandName: "",
  usageHint: "debug-app --help",
  iconPath: "assets/icon.png",
  screenshotsText: "assets/screenshots/screen-a.png",
  targets: [
    {
      editorId: createBuilderTargetEditorId("lab-target-1"),
      os: "linux",
      arch: "x86_64",
      variant: "default",
      desktopEnvironment: "all",
      guiEntrypoint: "app/bin/debug-app",
      cliEntrypoint: "app/bin/debug-app",
    },
  ],
});

type BuilderPreviewScenario = "clean" | "missingIdentity" | "cliMissingCommand" | "ambiguousTargets" | "assetErrors";

const defaultVariantForTarget = (os: BuilderTarget["os"], desktopEnvironment: BuilderTarget["desktopEnvironment"]): string => {
  if (os !== "linux") {
    return "default";
  }
  if (desktopEnvironment === "x11") {
    return "x11";
  }
  if (desktopEnvironment === "wayland") {
    return "wayland";
  }
  return "default";
};

const buildPreviewScenarioForm = (scenario: BuilderPreviewScenario): BuilderFormState => {
  const base = defaultDebugBuilderForm();
  if (scenario === "missingIdentity") {
    return { ...base, appId: "", appUuid: "", packageUuid: "" };
  }
  if (scenario === "cliMissingCommand") {
    return { ...base, hasCli: true, commandName: "" };
  }
  if (scenario === "ambiguousTargets") {
    return {
      ...base,
      targets: [
        {
          editorId: createBuilderTargetEditorId("lab-target-1"),
          os: "linux",
          arch: "x86_64",
          variant: "default",
          desktopEnvironment: "all",
          guiEntrypoint: "app/bin/debug-app",
          cliEntrypoint: "app/bin/debug-app",
        },
        {
          editorId: createBuilderTargetEditorId("lab-target-2"),
          os: "linux",
          arch: "x86_64",
          variant: "alt",
          desktopEnvironment: "x11",
          guiEntrypoint: "app/bin/debug-app",
          cliEntrypoint: "app/bin/debug-app",
        },
      ],
    };
  }
  if (scenario === "assetErrors") {
    return {
      ...base,
      iconPath: "",
      screenshotsText: "",
      requiresLicenseAcceptance: true,
      licenseFile: "",
    };
  }
  return base;
};

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
  const [builderScenario, setBuilderScenario] = useState<BuilderPreviewScenario>("clean");
  const [builderStepPreview, setBuilderStepPreview] = useState<BuilderStep>("targets");
  const [builderActiveTargetIndex, setBuilderActiveTargetIndex] = useState(-1);
  const [builderFormPreview, setBuilderFormPreview] = useState<BuilderFormState>(() => buildPreviewScenarioForm("clean"));
  const [showBuilderChecklistPreview, setShowBuilderChecklistPreview] = useState(false);
  const [showBuilderManifestPreview, setShowBuilderManifestPreview] = useState(false);
  const [builderReviewValidationState, setBuilderReviewValidationState] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [builderReviewValidationMessage, setBuilderReviewValidationMessage] = useState<string | null>(null);
  const [builderValidatedManifestSnapshot, setBuilderValidatedManifestSnapshot] = useState<string | null>(null);

  const builderScreenshots = useMemo(
    () => builderFormPreview.screenshotsText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
    [builderFormPreview.screenshotsText],
  );
  const builderStepIssueMap = useMemo(
    () => collectBuilderValidation({ form: builderFormPreview, screenshots: builderScreenshots, t: appText }),
    [builderFormPreview, builderScreenshots],
  );
  const builderTargetIds = useMemo(
    () => buildTargetIdList(builderFormPreview.targets),
    [builderFormPreview.targets],
  );
  const builderAllIssues = useMemo(
    () => builderSteps.flatMap((step) => builderStepIssueMap[step]),
    [builderStepIssueMap],
  );
  const builderStepIndex = builderSteps.indexOf(builderStepPreview);
  const builderFinalStep = builderStepIndex === builderSteps.length - 1;
  const builderManifestPreview = useMemo(() => {
    const manifest: Record<string, unknown> = {
      manifestVersion: "1.0.0",
      packageUuid: builderFormPreview.packageUuid,
      appId: builderFormPreview.appId,
      appUuid: builderFormPreview.appUuid,
      displayName: builderFormPreview.displayName,
      description: builderFormPreview.description,
      longDescription: builderFormPreview.longDescription,
      version: builderFormPreview.version,
      publisher: builderFormPreview.publisher,
      iconPath: builderFormPreview.iconPath,
      screenshots: builderScreenshots,
      interfaces: {
        gui: { enabled: builderFormPreview.hasGui },
        cli: {
          enabled: builderFormPreview.hasCli,
          commandName: builderFormPreview.commandName,
          usageHint: builderFormPreview.usageHint,
        },
      },
      targets: builderFormPreview.targets.map((target, index) => {
        const nextTarget: Record<string, unknown> = {
          id: builderTargetIds[index],
          os: target.os,
          arch: target.arch,
          variant: sanitizeTargetSegment(target.variant, "default"),
          payloadRoot: payloadRootForTarget(target),
          entrypoints: {
            gui: target.guiEntrypoint,
            cli: target.cliEntrypoint,
          },
        };
        if (target.os === "linux") {
          nextTarget.linux = { desktopEnvironments: linuxDesktopListForTarget(target) };
        }
        return nextTarget;
      }),
    };
    return JSON.stringify(manifest, null, 2);
  }, [builderFormPreview, builderScreenshots, builderTargetIds]);
  const isBuilderManifestValidated = builderReviewValidationState === "passed" && builderValidatedManifestSnapshot === builderManifestPreview;

  useEffect(() => {
    if (builderStepPreview === "targets") {
      setBuilderActiveTargetIndex(-1);
    }
  }, [builderStepPreview]);

  useEffect(() => {
    if (!builderValidatedManifestSnapshot || builderValidatedManifestSnapshot === builderManifestPreview) {
      return;
    }
    setBuilderReviewValidationState("idle");
    setBuilderReviewValidationMessage(null);
    setBuilderValidatedManifestSnapshot(null);
  }, [builderManifestPreview, builderValidatedManifestSnapshot]);

  const setPreviewTargetField = <Key extends keyof BuilderTarget>(index: number, key: Key, value: BuilderTarget[Key]) => {
    setBuilderFormPreview((current) => ({
      ...current,
      targets: current.targets.map((target, targetIndex) => {
        if (targetIndex !== index) {
          return target;
        }
        const updated = { ...target, [key]: value };
        if (key === "os") {
          const nextOs = value as BuilderTarget["os"];
          const nextDesktop = nextOs === "linux" ? updated.desktopEnvironment : "all";
          return {
            ...updated,
            desktopEnvironment: nextDesktop,
            variant: defaultVariantForTarget(nextOs, nextDesktop),
          };
        }
        if (key === "desktopEnvironment") {
          return {
            ...updated,
            variant: defaultVariantForTarget(updated.os, value as BuilderTarget["desktopEnvironment"]),
          };
        }
        return updated;
      }),
    }));
  };

  const setBuilderScenarioAndReset = (scenario: BuilderPreviewScenario) => {
    setBuilderScenario(scenario);
    setBuilderFormPreview(buildPreviewScenarioForm(scenario));
    setBuilderActiveTargetIndex(-1);
    setBuilderStepPreview("identity");
    setBuilderReviewValidationState("idle");
    setBuilderReviewValidationMessage(null);
    setBuilderValidatedManifestSnapshot(null);
  };

  const runBuilderReviewValidation = () => {
    if (builderAllIssues.length > 0) {
      const firstIssueStep = builderSteps.find((nextStep) => builderStepIssueMap[nextStep].length > 0);
      const firstIssue = firstIssueStep ? builderStepIssueMap[firstIssueStep][0] : null;
      if (firstIssueStep) {
        setBuilderStepPreview(firstIssueStep);
      }
      if (firstIssue) {
        onToast("warning", firstIssue);
      }
      setBuilderReviewValidationState("failed");
      setBuilderReviewValidationMessage(firstIssue ?? appText("builder.review.validateFailed"));
      setBuilderValidatedManifestSnapshot(null);
      return;
    }
    setBuilderReviewValidationState("running");
    setBuilderReviewValidationMessage(null);
    window.setTimeout(() => {
      const message = appText("builder.review.validatePassed");
      setBuilderReviewValidationState("passed");
      setBuilderReviewValidationMessage(message);
      setBuilderValidatedManifestSnapshot(builderManifestPreview);
      onToast("success", message);
    }, 180);
  };

  const goBuilderPreviewBack = () => {
    if (builderStepIndex <= 0) {
      return;
    }
    setBuilderStepPreview(builderSteps[builderStepIndex - 1]);
  };

  const goBuilderPreviewNext = () => {
    if (builderFinalStep) {
      return;
    }
    const currentIssues = builderStepIssueMap[builderStepPreview];
    if (currentIssues.length > 0) {
      onToast("warning", appText("builder.validation.blockedStep", {
        step: appText(`builder.steps.${builderStepPreview}`),
        count: currentIssues.length,
      }));
      return;
    }
    setBuilderStepPreview(builderSteps[builderStepIndex + 1]);
  };

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
          <div class={actionBar}>
            <Button onClick={() => setBuilderScenarioAndReset("clean")}>{appText("debugLab.builder.scenario.clean")}</Button>
            <Button onClick={() => setBuilderScenarioAndReset("missingIdentity")}>{appText("debugLab.builder.scenario.identity")}</Button>
            <Button onClick={() => setBuilderScenarioAndReset("cliMissingCommand")}>{appText("debugLab.builder.scenario.cli")}</Button>
            <Button onClick={() => setBuilderScenarioAndReset("ambiguousTargets")}>{appText("debugLab.builder.scenario.targets")}</Button>
            <Button onClick={() => setBuilderScenarioAndReset("assetErrors")}>{appText("debugLab.builder.scenario.assets")}</Button>
          </div>

          <div class={workspace}>
            <BuilderStepStatusNav
              steps={builderSteps}
              currentStep={builderStepPreview}
              onSelectStep={setBuilderStepPreview}
              stepIssueMap={builderStepIssueMap}
              ariaLabel={appText("builder.steps.aria")}
            />
            <div class={editorCard}>
              <div class={targetListActions}>
                <h3>{appText(`builder.steps.${builderStepPreview}`)}</h3>
                <div class={row}>
                  <Button onClick={() => setShowBuilderChecklistPreview(true)}>{appText("builder.checklist.title")}</Button>
                  <Button onClick={() => setShowBuilderManifestPreview(true)}>{appText("builder.previewOpen")}</Button>
                </div>
              </div>

              {builderStepIssueMap[builderStepPreview].length > 0 ? (
                <div class={targetDuplicateWarning}>
                  <strong>{appText("builder.validation.title")}</strong>
                  <ul class={targetValidationList}>
                    {builderStepIssueMap[builderStepPreview].map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {builderStepPreview === "targets" ? (
                <div class={targetList}>
                  {builderFormPreview.targets.map((target, index) => (
                    <AccordionRow
                      key={target.editorId}
                      expanded={builderActiveTargetIndex === index}
                      titleText={`${appText(`builder.targets.os.${target.os}`)} / ${target.arch}${(builderFormPreview.hasGui && target.variant.trim() && target.variant.trim() !== "default") ? ` / ${target.variant.trim()}` : ""}`}
                      subtitleText={target.os === "linux"
                        ? (builderFormPreview.hasGui ? appText(`builder.targets.desktop.${target.desktopEnvironment}`) : appText("builder.targets.desktopInactiveCli"))
                        : appText("builder.targets.osUnsupportedInline")}
                      onToggle={() => setBuilderActiveTargetIndex(builderActiveTargetIndex === index ? -1 : index)}
                    >
                      <BuilderTargetCard
                        target={target}
                        isBusy={false}
                        hasGui={builderFormPreview.hasGui}
                        hasCli={builderFormPreview.hasCli}
                        binaryTargetPath={null}
                        binarySourceName={null}
                        onBrowseBinary={() => onToast("info", appText("debugLab.builder.binaryToast"))}
                        onClearBinary={() => onToast("info", appText("debugLab.builder.removeDisabled"))}
                        onSetField={(key, value) => setPreviewTargetField(index, key, value)}
                      />
                      <div class={targetListActions}>
                        <span />
                        <Button variant="danger" fullWidthOnSmall={false} onClick={() => onToast("info", appText("debugLab.builder.removeDisabled"))}>
                          {appText("builder.targets.remove")}
                        </Button>
                      </div>
                    </AccordionRow>
                  ))}
                </div>
              ) : builderStepPreview === "review" ? (
                <div class={stack}>
                  <div class={wizardFooterActions}>
                    <Button variant="primary" onClick={runBuilderReviewValidation}>
                      {builderReviewValidationState === "running" ? appText("builder.review.validating") : appText("builder.review.validate")}
                    </Button>
                  </div>
                  {builderReviewValidationMessage ? <p>{builderReviewValidationMessage}</p> : null}
                  {!isBuilderManifestValidated ? <p>{appText("builder.review.mustValidate")}</p> : null}
                </div>
              ) : (
                <MessagePanel tone="info" title={appText("debugLab.builder.placeholderTitle")}>
                  {appText("debugLab.builder.placeholderBody", { step: appText(`builder.steps.${builderStepPreview}`) })}
                </MessagePanel>
              )}

              <div class={wizardFooter}>
                <span>{appText("builder.footer.step", { current: builderStepIndex + 1, total: builderSteps.length })}</span>
                <div class={wizardFooterActions}>
                  <Button onClick={goBuilderPreviewBack} disabled={builderStepIndex === 0}>{appText("builder.back")}</Button>
                  {!builderFinalStep ? (
                    <Button variant="primary" onClick={goBuilderPreviewNext}>{appText("builder.next")}</Button>
                  ) : (
                    <Button variant="primary" onClick={() => setShowBuilderChecklistPreview(true)} disabled={!isBuilderManifestValidated}>{appText("builder.build")}</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p class={sectionDescription}>{appText("debugLab.builder.activeScenario", { scenario: appText(`debugLab.builder.scenario.${builderScenario}`) })}</p>
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

      <BuilderSaveChecklistModal
        isOpen={showBuilderChecklistPreview}
        steps={builderSteps}
        stepIssueMap={builderStepIssueMap}
        canContinue={builderAllIssues.length === 0}
        isBusy={false}
        intent="build"
        onClose={() => setShowBuilderChecklistPreview(false)}
        onContinue={() => onToast("success", appText("debugLab.builder.checklistContinue"))}
      />

      <BuilderManifestPreviewModal
        isOpen={showBuilderManifestPreview}
        manifestPreview={builderManifestPreview}
        onClose={() => setShowBuilderManifestPreview(false)}
      />
    </Panel>
  );
};
