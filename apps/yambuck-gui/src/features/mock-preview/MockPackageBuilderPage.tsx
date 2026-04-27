import { useMemo, useState } from "preact/hooks";
import { IconFileText, IconLayoutGrid, IconPlus, IconX } from "@tabler/icons-preact";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { Panel } from "../../components/ui/Panel";
import { PanelHeader } from "../../components/ui/PanelHeader";
import { TextField } from "../../components/ui/TextField";
import { appText } from "../../i18n/app";
import {
  buildTargetIdList,
  collectBuilderValidation,
  linuxDesktopListForTarget,
  payloadRootForTarget,
  sanitizeTargetSegment,
} from "../package-builder/builderValidation";
import {
  builderMaxScreenshots,
  builderSteps,
  createBuilderTargetEditorId,
  type BuilderFormState,
  type BuilderStep,
  type BuilderTarget,
} from "../package-builder/builderTypes";
import { ModalShell } from "../../components/ui/ModalShell";
import { WizardStepper, type WizardStepperStep } from "../../components/ui/WizardStepper";
import { BuilderFieldLabel } from "../package-builder/components/BuilderFieldLabel";
import { BuilderManifestPreviewModal } from "../package-builder/components/BuilderManifestPreviewModal";
import { BuilderSaveChecklistModal } from "../package-builder/components/BuilderSaveChecklistModal";
import { BuilderTargetCard } from "../package-builder/components/BuilderTargetCard";
import {
  field,
  fieldControlRow,
  fieldGrid,
  fieldStack,
  compactFieldStack,
  assetSection,
  compactCheckbox,
  descriptionTextarea,
  importTextarea,
  pagePanel,
  sectionBody,
  targetDuplicateWarning,
  targetList,
  targetAddButton,
  targetAddRow,
  targetListActions,
  targetValidationList,
  assetThumbGrid,
  assetThumbGridCompact,
  assetThumbAdd,
  assetThumbAddIcon,
  assetThumbDocIcon,
  assetThumbImage,
  assetThumbPlaceholder,
  assetThumbOpen,
  assetThumbRemove,
  assetThumbTile,
  assetThumbTileCompact,
  wizardFooter,
  wizardFooterActions,
  workspace,
  startCard,
  startActions,
} from "../package-builder/packageBuilderPage.css";

import type { JSX } from "preact";

type MockPackageBuilderPageProps = {
  onToast: (tone: "info" | "success" | "warning" | "error", message: string) => void;
};

type BuilderMode = "start" | "new";
type SaveIntent = "save" | "saveAs" | "build";

const generateUuid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
};

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
  commandName: "debug-app",
  usageHint: "debug-app --help",
  iconPath: "assets/icon.png",
  screenshotsText: "assets/screenshots/screen-a.png",
  targets: [
    {
      editorId: createBuilderTargetEditorId("mock-target-1"),
      arch: "x86_64",
      variant: "default",
      desktopEnvironment: "all",
      guiEntrypoint: "app/bin/debug-app",
      cliEntrypoint: "app/bin/debug-app",
    },
  ],
});

const mockScreenshotCandidates = [
  { manifestPath: "assets/screenshots/screen-a.png", previewSrc: "/mock/example-app-screenshot.png" },
  { manifestPath: "assets/screenshots/screen-b.png", previewSrc: "/mock/example-app-screenshot.png" },
  { manifestPath: "assets/screenshots/screen-c.png", previewSrc: "/mock/example-app-screenshot.png" },
  { manifestPath: "assets/screenshots/screen-d.png", previewSrc: "/mock/example-app-screenshot.png" },
  { manifestPath: "assets/screenshots/screen-e.png", previewSrc: "/mock/example-app-screenshot.png" },
  { manifestPath: "assets/screenshots/screen-f.png", previewSrc: "/mock/example-app-screenshot.png" },
];

const parseScreenshotsText = (value: string): string[] =>
  value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);

const screenshotSlotsFromPaths = (paths: string[]): Array<string | null> => {
  const slots: Array<string | null> = Array.from({ length: builderMaxScreenshots }, () => null);
  paths.slice(0, builderMaxScreenshots).forEach((path, index) => {
    slots[index] = path;
  });
  return slots;
};

const screenshotPathsFromSlots = (slots: Array<string | null>): string[] =>
  slots.flatMap((slot) => (slot ? [slot] : []));

const mockScreenshotPreviewSrc = (path: string): string =>
  mockScreenshotCandidates.find((entry) => entry.manifestPath === path)?.previewSrc ?? "/mock/example-app-screenshot.png";

export const MockPackageBuilderPage = ({ onToast }: MockPackageBuilderPageProps) => {
  const [mode, setMode] = useState<BuilderMode>("start");
  const [step, setStep] = useState<BuilderStep>(builderSteps[0]);
  const [form, setForm] = useState<BuilderFormState>(() => defaultDebugBuilderForm());
  const [screenshotSlots, setScreenshotSlots] = useState<Array<string | null>>(() =>
    screenshotSlotsFromPaths(parseScreenshotsText(defaultDebugBuilderForm().screenshotsText)),
  );
  const [activeTargetIndex, setActiveTargetIndex] = useState(-1);
  const [statusMessage] = useState<string | null>(null);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [pendingSaveIntent, setPendingSaveIntent] = useState<SaveIntent | null>(null);

  const screenshots = useMemo(
    () => parseScreenshotsText(form.screenshotsText),
    [form.screenshotsText],
  );

  const targetIdList = useMemo(() => buildTargetIdList(form.targets), [form.targets]);

  const stepIssueMap = useMemo(
    () => collectBuilderValidation({ form, screenshots, t: appText }),
    [form, screenshots],
  );

  const wizardSteps: WizardStepperStep[] = useMemo(() => [
    { id: "start", label: appText("builder.steps.start") },
    ...builderSteps.map((step) => ({ id: step, label: appText(`builder.steps.${step}`) })),
  ], []);

  const currentStepperStep = mode === "start" ? "start" : step;

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showAppUuidConfirm, setShowAppUuidConfirm] = useState(false);
  const [licensePreviewText, setLicensePreviewText] = useState<string | null>(null);

  const confirmBackToStart = () => {
    setShowDiscardConfirm(true);
  };

  const handleDiscard = () => {
    const nextForm = defaultDebugBuilderForm();
    setForm(nextForm);
    setScreenshotSlots(screenshotSlotsFromPaths(parseScreenshotsText(nextForm.screenshotsText)));
    setActiveTargetIndex(-1);
    setShowDiscardConfirm(false);
    setMode("start");
  };

  const applyGeneratedAppUuid = () => {
    setField("appUuid", generateUuid());
    setShowAppUuidConfirm(false);
  };

  const requestGeneratedAppUuid = () => {
    if (form.appUuid.trim().length > 0) {
      setShowAppUuidConfirm(true);
      return;
    }
    applyGeneratedAppUuid();
  };

  const allValidationIssues = useMemo(
    () => builderSteps.flatMap((builderStep) => stepIssueMap[builderStep]),
    [stepIssueMap],
  );
  
  const targetValidationIssues = stepIssueMap.targets;
  
  const currentStepIndex = builderSteps.indexOf(step);
  const isFinalStep = currentStepIndex === builderSteps.length - 1;

  const manifestPreview = useMemo(() => {
    const nextManifest: Record<string, unknown> = {
      manifestVersion: "1.0.0",
      packageUuid: form.packageUuid,
      appId: form.appId,
      appUuid: form.appUuid,
      displayName: form.displayName,
      description: form.description,
      longDescription: form.longDescription,
      version: form.version,
      publisher: form.publisher,
      iconPath: form.iconPath,
      screenshots,
      interfaces: {
        gui: { enabled: form.hasGui },
        cli: {
          enabled: form.hasCli,
          commandName: form.commandName,
          usageHint: form.usageHint,
        },
      },
      targets: form.targets.map((target, index) => ({
        id: targetIdList[index] ?? "",
        os: "linux",
        arch: target.arch,
        variant: sanitizeTargetSegment(target.variant, "default"),
        payloadRoot: payloadRootForTarget(target),
        entrypoints: {
          gui: target.guiEntrypoint,
          cli: target.cliEntrypoint,
        },
        linux: {
          desktopEnvironments: linuxDesktopListForTarget(target),
        },
      })),
    };
    return JSON.stringify(nextManifest, null, 2);
  }, [form, screenshots, targetIdList]);

  const iconPreviewSrc: string | null = form.iconPath ? "/mock/example-app-icon.png" : null;

  const setField = <Key extends keyof BuilderFormState>(key: Key, value: BuilderFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const syncScreenshotSlots = (nextSlots: Array<string | null>) => {
    setScreenshotSlots(nextSlots);
    setField("screenshotsText", screenshotPathsFromSlots(nextSlots).join("\n"));
  };

  const setTargetField = <Key extends keyof BuilderTarget>(index: number, key: Key, value: BuilderTarget[Key]) => {
    setForm((current) => ({
      ...current,
      targets: current.targets.map((target, targetIndex) => (targetIndex === index ? { ...target, [key]: value } : target)),
    }));
  };

  const renderStepEditor = () => {
    if (step === "identity") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.identity")}</p>
          <label class={fieldStack}>
            <BuilderFieldLabel label={appText("builder.fields.appId")} help={appText("builder.help.appId")} />
            <TextField value={form.appId} onInput={(value) => setField("appId", value)} />
          </label>
          <label class={fieldStack}>
            <BuilderFieldLabel label={appText("builder.fields.appUuid")} help={appText("builder.help.appUuid")} />
            <div class={fieldControlRow}>
              <TextField value={form.appUuid} onInput={(value) => setField("appUuid", value)} />
              <Button onClick={requestGeneratedAppUuid}>{appText("builder.generateUuid")}</Button>
            </div>
          </label>
          <label class={fieldStack}>
            <BuilderFieldLabel label={appText("builder.fields.packageUuid")} help={appText("builder.help.packageUuid")} />
            <TextField value={form.packageUuid} readOnly disabled />
          </label>
        </div>
      );
    }
    
    if (step === "metadata") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.metadata")}</p>
          <label class={`${fieldStack} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.displayName")} help={appText("builder.help.displayName")} />
            <TextField value={form.displayName} onInput={(value) => setField("displayName", value)} />
          </label>
          <label class={fieldStack}>
            <BuilderFieldLabel label={appText("builder.fields.description")} help={appText("builder.help.description")} />
            <textarea
              class={descriptionTextarea}
              value={form.description}
              onInput={(event: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => setField("description", event.currentTarget.value)}
            />
          </label>
          <label class={fieldStack}>
            <BuilderFieldLabel label={appText("builder.fields.longDescription")} help={appText("builder.help.longDescription")} />
            <textarea
              class={importTextarea}
              value={form.longDescription}
              onInput={(event: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => setField("longDescription", event.currentTarget.value)}
            />
          </label>
          <label class={`${fieldStack} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.version")} help={appText("builder.help.version")} />
            <TextField value={form.version} onInput={(value) => setField("version", value)} />
          </label>
          <label class={`${fieldStack} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.publisher")} help={appText("builder.help.publisher")} />
            <TextField value={form.publisher} onInput={(value) => setField("publisher", value)} />
          </label>
          <label class={`${fieldStack} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.homepageUrl")} help={appText("builder.help.homepageUrl")} />
            <TextField value={form.homepageUrl} onInput={(value) => setField("homepageUrl", value)} />
          </label>
          <label class={`${fieldStack} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.supportUrl")} help={appText("builder.help.supportUrl")} />
            <TextField value={form.supportUrl} onInput={(value) => setField("supportUrl", value)} />
          </label>
        </div>
      );
    }
    
    if (step === "interfaces") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.interfaces")}</p>
          <CheckboxField class={compactCheckbox} checked={form.hasGui} onChange={(checked) => setField("hasGui", checked)}>{appText("builder.fields.hasGui")}</CheckboxField>
          <CheckboxField class={compactCheckbox} checked={form.hasCli} onChange={(checked) => setField("hasCli", checked)}>{appText("builder.fields.hasCli")}</CheckboxField>
          {form.hasCli ? (
            <>
              <label class={fieldStack}>
                <BuilderFieldLabel label={appText("builder.fields.commandName")} help={appText("builder.help.commandName")} />
                <TextField value={form.commandName} onInput={(value) => setField("commandName", value)} />
              </label>
              <label class={fieldStack}>
                <BuilderFieldLabel label={appText("builder.fields.usageHint")} help={appText("builder.help.usageHint")} />
                <TextField value={form.usageHint} onInput={(value) => setField("usageHint", value)} />
              </label>
            </>
          ) : null}
        </div>
      );
    }

    if (step === "targets") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.targets")}</p>
          <div>
            <div class={targetListActions}>
              <h3>{appText("builder.targets.title")}</h3>
            </div>
            {targetValidationIssues.length > 0 ? (
              <div class={targetDuplicateWarning}>
                <strong>{appText("builder.validation.title")}</strong>
                <ul class={targetValidationList}>
                  {targetValidationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div class={targetList}>
              {form.targets.map((target, index) => (
                <BuilderTargetCard
                  key={target.editorId}
                  target={target}
                  isActive={index === activeTargetIndex}
                  canRemove={form.targets.length > 1}
                  isBusy={false}
                  hasGui={form.hasGui}
                  hasCli={form.hasCli}
                  binaryTargetPath={null}
                  binarySourceName={null}
                  payloadRoot={payloadRootForTarget(target)}
                  onToggle={() => setActiveTargetIndex(index === activeTargetIndex ? -1 : index)}
                  onRemove={() => onToast("info", appText("debugLab.builder.removeDisabled"))}
                  onBrowseBinary={() => onToast("info", appText("debugLab.builder.binaryToast"))}
                  onClearBinary={() => onToast("info", appText("debugLab.builder.removeDisabled"))}
                  onSetField={(key, value) => setTargetField(index, key, value)}
                />
              ))}
            </div>
            <div class={targetAddRow}>
              <button
                type="button"
                class={targetAddButton}
                onClick={() => onToast("info", "Target add disabled in mock mode")}
                title={appText("builder.targets.add")}
              >
                <span class={assetThumbAddIcon}><IconPlus size={16} stroke={2.6} /></span>
                <span>{appText("builder.targets.add")}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    if (step === "assets") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.assets")}</p>
          <div class={`${assetSection} ${fieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.iconUpload")} help={appText("builder.help.iconUpload")} />
            <div class={assetThumbGridCompact}>
              <div class={`${assetThumbTile} ${assetThumbTileCompact}`}>
                {form.iconPath ? (
                  <img class={assetThumbImage} src="/mock/example-app-icon.png" alt={appText("builder.fields.iconUpload")} />
                ) : null}
                {form.iconPath ? (
                  <button class={assetThumbRemove} type="button" onClick={() => setField("iconPath", "")} title={appText("builder.files.remove")}>
                    <IconX size={14} stroke={2.4} />
                  </button>
                ) : (
                  <button class={assetThumbAdd} type="button" onClick={mockBrowseIcon} title={appText("builder.files.browseIcon")}>
                    <span class={assetThumbAddIcon}><IconPlus size={16} stroke={2.6} /></span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div class={`${assetSection} ${fieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.screenshotUpload")} help={appText("builder.help.screenshotUpload")} />
            <div class={assetThumbGrid}>
              {screenshotSlots.map((path, index) => (
                <div key={path ?? `mock-screenshot-slot-${index}`} class={assetThumbTile}>
                  {path ? (
                    <img class={assetThumbImage} src={mockScreenshotPreviewSrc(path)} alt={appText("package.screenshot.alt", { index: index + 1 })} />
                  ) : null}
                  {path ? (
                    <button class={assetThumbRemove} type="button" onClick={() => removeMockScreenshot(index)} title={appText("builder.files.removeScreenshot")}>
                      <IconX size={14} stroke={2.4} />
                    </button>
                  ) : (
                    <button
                      class={assetThumbAdd}
                      type="button"
                      onClick={() => addMockScreenshotAtSlot(index)}
                      title={appText("builder.files.addScreenshotSlot", { index: index + 1 })}
                    >
                      <span class={assetThumbAddIcon}><IconPlus size={16} stroke={2.6} /></span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div class={`${assetSection} ${fieldStack}`}>
            <label class={`${fieldStack} ${compactFieldStack}`}>
              <BuilderFieldLabel label={appText("builder.fields.license")} help={appText("builder.help.license")} />
              <TextField value={form.license} onInput={(value) => setField("license", value)} />
            </label>
            <BuilderFieldLabel label={appText("builder.fields.licenseUpload")} help={appText("builder.help.licenseUpload")} />
            <div class={assetThumbGridCompact}>
              <div class={`${assetThumbTile} ${assetThumbTileCompact}`}>
                {form.licenseFile ? (
                  <>
                    <button class={assetThumbOpen} type="button" onClick={viewMockLicense} title={appText("builder.files.viewLicense")}>
                      <div class={assetThumbPlaceholder}>
                        <span class={assetThumbDocIcon}><IconFileText size={56} stroke={1.8} /></span>
                      </div>
                    </button>
                    <button class={assetThumbRemove} type="button" onClick={() => setField("licenseFile", "")} title={appText("builder.files.remove")}>
                      <IconX size={14} stroke={2.4} />
                    </button>
                  </>
                ) : (
                  <button class={assetThumbAdd} type="button" onClick={mockBrowseLicenseFile} title={appText("builder.files.browseLicense")}>
                    <span class={assetThumbAddIcon}><IconPlus size={16} stroke={2.6} /></span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <CheckboxField
            checked={form.requiresLicenseAcceptance}
            onChange={(checked) => setField("requiresLicenseAcceptance", checked)}
          >
            {appText("builder.fields.requiresLicenseAcceptance")}
          </CheckboxField>
        </div>
      );
    }
    
    return <p class={sectionBody}>{appText("builder.emptyReview")}</p>;
  };

  const mockBrowseIcon = () => {
    setField("iconPath", "assets/icon-updated.png");
    onToast("info", appText("builder.files.browseIcon"));
  };

  const addMockScreenshotAtSlot = (slotIndex: number) => {
    const used = new Set(screenshotPathsFromSlots(screenshotSlots));
    const nextCandidate = mockScreenshotCandidates.find((entry) => !used.has(entry.manifestPath));
    if (!nextCandidate) {
      onToast("info", appText("builder.files.screenshotLimitReached", { max: builderMaxScreenshots }));
      return;
    }
    const nextSlots = screenshotSlots.map((slot, index) => (index === slotIndex ? nextCandidate.manifestPath : slot));
    syncScreenshotSlots(nextSlots);
    onToast("info", appText("builder.files.addScreenshot"));
  };

  const removeMockScreenshot = (slotIndex: number) => {
    const nextSlots = screenshotSlots.map((slot, index) => (index === slotIndex ? null : slot));
    syncScreenshotSlots(nextSlots);
  };

  const mockBrowseLicenseFile = () => {
    setField("licenseFile", "assets/licenses/LICENSE.txt");
    onToast("info", appText("builder.files.browseLicense"));
  };

  const viewMockLicense = () => {
    setLicensePreviewText("Mock license preview\n\nReplace this with staged license content in real mode.");
  };

  const handleStartMock = () => {
    setMode("new");
    setActiveTargetIndex(-1);
    setStep(builderSteps[0]);
  };

  const selectStep = (nextStep: BuilderStep) => {
    setStep(nextStep);
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) selectStep(builderSteps[currentStepIndex - 1]);
  };

  const goToNextStep = () => {
    if (isFinalStep) return;
    const currentIssues = stepIssueMap[step];
    if (currentIssues.length > 0) {
      onToast("warning", currentIssues[0]);
      return;
    }
    selectStep(builderSteps[currentStepIndex + 1]);
  };

  const openSaveChecklist = (intent: SaveIntent) => {
    setPendingSaveIntent(intent);
    if (allValidationIssues.length > 0) {
      const firstIssueStep = builderSteps.find((builderStep) => stepIssueMap[builderStep].length > 0);
      if (firstIssueStep) setStep(firstIssueStep);
      onToast("warning", appText("builder.validation.blockedSave", { count: allValidationIssues.length }));
    }
  };

  if (mode === "start") {
    return (
      <Panel class={pagePanel}>
        <PanelHeader title={appText("builder.title")}>{appText("builder.subtitle")}</PanelHeader>
        <WizardStepper
          steps={wizardSteps}
          currentStepId={currentStepperStep}
          align="center"
        />
        <section class={startCard}>
          <h2>{appText("builder.startTitle")}</h2>
          <p>{appText("builder.startBody")}</p>
          <div class={startActions}>
            <Button variant="primary" onClick={handleStartMock}>{appText("builder.startNew")}</Button>
            <Button onClick={handleStartMock}>{appText("builder.startExisting")}</Button>
          </div>
        </section>
      </Panel>
    );
  }

  return (
    <Panel class={pagePanel}>
      <PanelHeader
        variant="app"
        title={form.displayName || appText("builder.title")}
        iconSrc={iconPreviewSrc ?? undefined}
        iconAlt={appText("package.iconAlt", { appName: form.displayName || appText("builder.title") })}
        iconPlaceholder={<IconLayoutGrid size={32} stroke={1.9} />}
      >
        {appText("builder.subtitle")}
      </PanelHeader>
      <WizardStepper
        steps={wizardSteps}
        currentStepId={currentStepperStep}
        align="center"
      />
      
      {statusMessage ? <p class={field}>{statusMessage}</p> : null}

      <section class={workspace}>

        {renderStepEditor()}

        <div class={wizardFooter}>
          <div class={wizardFooterActions}>
            <Button onClick={() => (currentStepIndex === 0 ? confirmBackToStart() : goToPreviousStep())}>{appText("builder.back")}</Button>
            {!isFinalStep ? (
              <Button variant="primary" onClick={goToNextStep}>{appText("builder.next")}</Button>
            ) : (
              <>
                <Button onClick={() => setIsManifestModalOpen(true)}>{appText("builder.previewOpen")}</Button>
                <Button variant="primary" onClick={() => openSaveChecklist("build")}>{appText("builder.build")}</Button>
              </>
            )}
          </div>
        </div>
      </section>

      <BuilderSaveChecklistModal
        isOpen={Boolean(pendingSaveIntent)}
        steps={builderSteps}
        stepIssueMap={stepIssueMap}
        canContinue={allValidationIssues.length === 0}
        isBusy={false}
        intent={pendingSaveIntent ?? "saveAs"}
        onClose={() => setPendingSaveIntent(null)}
        onContinue={() => {
          setField("packageUuid", generateUuid());
          setPendingSaveIntent(null);
          onToast("success", appText("debugLab.builder.checklistContinue"));
        }}
      />

      <BuilderManifestPreviewModal
        isOpen={isManifestModalOpen}
        manifestPreview={manifestPreview}
        onClose={() => setIsManifestModalOpen(false)}
      />
      {licensePreviewText ? (
        <ModalShell onClose={() => setLicensePreviewText(null)} closeTitle={appText("modal.close.license")}>
          <section>
            <h2>{appText("builder.files.viewLicense")}</h2>
            <pre class={importTextarea}>{licensePreviewText}</pre>
          </section>
        </ModalShell>
      ) : null}
      {showAppUuidConfirm ? (
        <ModalShell onClose={() => setShowAppUuidConfirm(false)}>
          <section>
            <h2>{appText("builder.uuidConfirm.appUuidTitle")}</h2>
            <p>{appText("builder.uuidConfirm.appUuidBody")}</p>
            <div class="modal-actions">
              <Button onClick={() => setShowAppUuidConfirm(false)}>{appText("builder.uuidConfirm.cancel")}</Button>
              <Button variant="primary" onClick={applyGeneratedAppUuid}>{appText("builder.uuidConfirm.confirm")}</Button>
            </div>
          </section>
        </ModalShell>
      ) : null}
      {showDiscardConfirm && (
        <ModalShell onClose={() => setShowDiscardConfirm(false)}>
          <section>
            <h2>{appText("builder.confirmDiscard.title")}</h2>
            <p>{appText("builder.confirmDiscard.body")}</p>
            <div class="modal-actions">
              <Button onClick={() => setShowDiscardConfirm(false)}>{appText("builder.confirmDiscard.cancel")}</Button>
              <Button variant="danger" onClick={handleDiscard}>{appText("builder.confirmDiscard.discard")}</Button>
            </div>
          </section>
        </ModalShell>
      )}
    </Panel>
  );
};
