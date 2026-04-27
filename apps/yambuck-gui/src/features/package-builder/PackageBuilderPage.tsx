import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { IconLayoutGrid, IconPhoto, IconX } from "@tabler/icons-preact";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { Panel } from "../../components/ui/Panel";
import { PanelHeader } from "../../components/ui/PanelHeader";
import { TextField } from "../../components/ui/TextField";
import { appText } from "../../i18n/app";
import { logUiAction, logUiError } from "../../lib/ui-log";
import {
  createBuilderSession,
  discardBuilderSession,
  openBuilderPackage,
  saveBuilderSession,
  saveBuilderSessionAs,
  stageBuilderFiles,
} from "../../lib/tauri/api";
import type { BuilderStagedFile } from "../../types/app";
import {
  buildTargetIdList,
  collectBuilderValidationResult,
  linuxDesktopListForTarget,
  payloadRootForTarget,
  sanitizeTargetSegment,
} from "./builderValidation";
import {
  builderMaxScreenshots,
  builderSteps,
  type BuilderArch,
  type BuilderFormState,
  type BuilderStep,
  type BuilderTarget,
} from "./builderTypes";
import { ModalShell } from "../../components/ui/ModalShell";
import { WizardStepper, type WizardStepperStep } from "../../components/ui/WizardStepper";
import { BuilderManifestPreviewModal } from "./components/BuilderManifestPreviewModal";
import { BuilderFieldLabel } from "./components/BuilderFieldLabel";
import { BuilderSaveChecklistModal } from "./components/BuilderSaveChecklistModal";
import { BuilderTargetCard } from "./components/BuilderTargetCard";
import {
  actionBar,
  field,
  fieldControlRow,
  fieldGrid,
  fieldInvalid,
  fieldStackInvalid,
  fieldStack,
  assetSection,
  inlineActionButton,
  compactCheckbox,
  importTextarea,
  pagePanel,
  previewTitle,
  sectionBody,
  targetDuplicateWarning,
  targetValidationList,
  stagedAssetItem,
  stagedAssetList,
  stagedAssetMeta,
  stagedAssetPath,
  stepIssueList,
  stepIssuePanel,
  assetThumbGrid,
  assetThumbTile,
  assetThumbImage,
  assetThumbPlaceholder,
  assetThumbSlotText,
  assetThumbRemove,
  assetActionRow,
  startActions,
  startCard,
  statusBadge,
  targetList,
  targetListActions,
  workspace,
  wizardFooter,
  wizardFooterActions,
} from "./packageBuilderPage.css";

type ToastTone = "info" | "success" | "warning" | "error";

type BuilderMode = "start" | "new";
type SaveIntent = "save" | "saveAs" | "build";

type StagedAsset = {
  id: string;
  kind: "icon" | "screenshot" | "binary" | "license";
  sourceName: string;
  targetPath: string;
  sourcePath?: string;
  arch?: string;
};

type PackageBuilderPageProps = {
  onToast: (tone: ToastTone, message: string, durationMs?: number) => void;
};

const defaultTarget = (arch: BuilderArch, index = 0): BuilderTarget => {
  const variant = index === 0 ? "default" : `variant-${index + 1}`;
  return {
    arch,
    variant,
    desktopEnvironment: "all",
    guiEntrypoint: "app/bin/example-app",
    cliEntrypoint: "app/bin/example-app",
  };
};

const defaultBuilderForm = (): BuilderFormState => ({
  appId: "com.example.app",
  appUuid: "",
  packageUuid: "",
  displayName: "Example App",
  description: "Short summary shown in installer preview.",
  longDescription: "Longer description shown in installer details.",
  version: "1.0.0",
  publisher: "Example Publisher",
  homepageUrl: "",
  supportUrl: "",
  license: "",
  licenseFile: "",
  requiresLicenseAcceptance: false,
  hasGui: true,
  hasCli: false,
  commandName: "",
  usageHint: "",
  iconPath: "assets/icon.png",
  screenshotsText: "assets/screenshots/screenshot-a.png",
  targets: [defaultTarget("x86_64")],
});

const asText = (value: unknown): string => (typeof value === "string" ? value : "");
const asBoolean = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);

const firstNonEmpty = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return "";
};

const normalizeScreenshots = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const normalizeArch = (value: unknown): BuilderArch => {
  if (value === "aarch64" || value === "riscv64") {
    return value;
  }
  return "x86_64";
};

const sanitizeFileName = (fileName: string): string => {
  const normalized = fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
  return normalized || "file.bin";
};

const fileBaseName = (path: string): string => {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
};

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

const toPathList = (value: string | string[] | null): string[] => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.length > 0);
  }
  return [value];
};

const normalizeTargets = (value: unknown): BuilderTarget[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return [defaultTarget("x86_64")];
  }

  const next = value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return defaultTarget("x86_64", index);
      }
      const target = entry as Record<string, unknown>;
      const entrypoints = (target.entrypoints ?? {}) as Record<string, unknown>;
      const arch = normalizeArch(target.arch);
      const variant = firstNonEmpty(target.variant, "default");
      const linux = (target.linux ?? {}) as Record<string, unknown>;
      const desktops = Array.isArray(linux.desktopEnvironments)
        ? linux.desktopEnvironments.filter((item) => typeof item === "string").map((item) => item.toLowerCase())
        : [];

      let desktopEnvironment: BuilderTarget["desktopEnvironment"] = "all";
      if (desktops.length === 1 && desktops[0] === "x11") {
        desktopEnvironment = "x11";
      }
      if (desktops.length === 1 && desktops[0] === "wayland") {
        desktopEnvironment = "wayland";
      }

      return {
        arch,
        variant,
        desktopEnvironment,
        guiEntrypoint: firstNonEmpty(entrypoints.gui, "app/bin/example-app"),
        cliEntrypoint: firstNonEmpty(entrypoints.cli, "app/bin/example-app"),
      };
    })
    .filter(Boolean);

  return next.length > 0 ? next : [defaultTarget("x86_64")];
};

const formFromManifest = (manifest: Record<string, unknown>): BuilderFormState => {
  const interfaces = (manifest.interfaces ?? {}) as Record<string, unknown>;
  const gui = (interfaces.gui ?? {}) as Record<string, unknown>;
  const cli = (interfaces.cli ?? {}) as Record<string, unknown>;
  const screenshots = normalizeScreenshots(manifest.screenshots);

  return {
    appId: asText(manifest.appId) || "com.example.app",
    appUuid: asText(manifest.appUuid),
    packageUuid: asText(manifest.packageUuid),
    displayName: asText(manifest.displayName) || "Example App",
    description: asText(manifest.description),
    longDescription: asText(manifest.longDescription),
    version: asText(manifest.version) || "1.0.0",
    publisher: asText(manifest.publisher),
    homepageUrl: asText(manifest.homepageUrl),
    supportUrl: asText(manifest.supportUrl),
    license: asText(manifest.license),
    licenseFile: asText(manifest.licenseFile),
    requiresLicenseAcceptance: asBoolean(manifest.requiresLicenseAcceptance, false),
    hasGui: asBoolean(gui.enabled, true),
    hasCli: asBoolean(cli.enabled, false),
    commandName: asText(cli.commandName),
    usageHint: asText(cli.usageHint),
    iconPath: asText(manifest.iconPath),
    screenshotsText: screenshots.join("\n"),
    targets: normalizeTargets(manifest.targets),
  };
};

export const PackageBuilderPage = ({ onToast }: PackageBuilderPageProps) => {
  const [mode, setMode] = useState<BuilderMode>("start");
  const [step, setStep] = useState<BuilderStep>("interfaces");
  const [form, setForm] = useState<BuilderFormState>(() => defaultBuilderForm());
  const [activeTargetIndex, setActiveTargetIndex] = useState(0);
  const [stagedAssets, setStagedAssets] = useState<StagedAsset[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [openedPackageFile, setOpenedPackageFile] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [pendingSaveIntent, setPendingSaveIntent] = useState<SaveIntent | null>(null);
  const [licensePreviewText, setLicensePreviewText] = useState<string | null>(null);

  const activeTarget = form.targets[activeTargetIndex] ?? null;

  const notify = (tone: ToastTone, key: string, params?: Record<string, string | number>) => {
    const message = appText(key, params);
    setStatusMessage(message);
    onToast(tone, message);
  };

  useEffect(() => {
    return () => {
      if (sessionId) {
        void discardBuilderSession(sessionId);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (form.targets.length === 0) {
      setActiveTargetIndex(0);
      return;
    }
    if (activeTargetIndex >= form.targets.length) {
      setActiveTargetIndex(form.targets.length - 1);
    }
  }, [form.targets.length, activeTargetIndex]);

  const screenshots = useMemo(
    () => form.screenshotsText.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean),
    [form.screenshotsText],
  );

  const targetIdList = useMemo(() => buildTargetIdList(form.targets), [form.targets]);

  const validation = useMemo(
    () => collectBuilderValidationResult({ form, screenshots, t: appText }),
    [form, screenshots],
  );

  const stepIssueMap = validation.stepIssues;
  const fieldIssues = validation.fieldIssues;

  const wizardSteps: WizardStepperStep[] = useMemo(() => [
    { id: "start", label: appText("builder.steps.start") },
    ...builderSteps.map((step) => ({ id: step, label: appText(`builder.steps.${step}`) })),
  ], []);

  const currentStepperStep = mode === "start" ? "start" : step;

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showAppUuidConfirm, setShowAppUuidConfirm] = useState(false);

  const confirmBackToStart = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setMode("start");
    }
  };

  const handleDiscard = async () => {
    if (sessionId) {
      await discardBuilderSession(sessionId);
    }
    setForm(defaultBuilderForm());
    setIsDirty(false);
    setSessionId(null);
    setOpenedPackageFile(null);
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

  const targetValidationIssues = stepIssueMap.targets;

  const allValidationIssues = useMemo(
    () => builderSteps.flatMap((builderStep) => stepIssueMap[builderStep]),
    [stepIssueMap],
  );
  const currentStepIndex = builderSteps.indexOf(step);
  const isFinalStep = currentStepIndex === builderSteps.length - 1;

  const buildManifestPreview = (packageUuid = form.packageUuid): string => {
    const nextManifest: Record<string, unknown> = {
      manifestVersion: "1.0.0",
      packageUuid,
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

    if (form.homepageUrl.trim()) {
      nextManifest.homepageUrl = form.homepageUrl;
    }
    if (form.supportUrl.trim()) {
      nextManifest.supportUrl = form.supportUrl;
    }
    if (form.license.trim()) {
      nextManifest.license = form.license;
    }
    if (form.licenseFile.trim()) {
      nextManifest.licenseFile = form.licenseFile;
    }
    if (form.requiresLicenseAcceptance || form.licenseFile.trim()) {
      nextManifest.requiresLicenseAcceptance = form.requiresLicenseAcceptance;
    }

    return JSON.stringify(nextManifest, null, 2);
  };

  const manifestPreview = useMemo(() => buildManifestPreview(), [form, screenshots, targetIdList]);

  const setField = <Key extends keyof BuilderFormState>(key: Key, value: BuilderFormState[Key]) => {
    const detailValue = typeof value === "string" ? value.length : value ? 1 : 0;
    logUiAction("builder-field-change", { field: key, valueMetric: detailValue });
    setStatusMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  };

  const setTargetField = <Key extends keyof BuilderTarget>(index: number, key: Key, value: BuilderTarget[Key]) => {
    logUiAction("builder-target-field-change", { index, field: key });
    setStatusMessage(null);
    setForm((current) => ({
      ...current,
      targets: current.targets.map((target, targetIndex) => (targetIndex === index ? { ...target, [key]: value } : target)),
    }));
    setIsDirty(true);
  };

  const addTarget = () => {
    const nextIndex = form.targets.length;
    const nextTarget = defaultTarget("x86_64", nextIndex);
    logUiAction("builder-target-add", { countBefore: form.targets.length });
    setForm((current) => ({ ...current, targets: [...current.targets, nextTarget] }));
    setActiveTargetIndex(nextIndex);
    setIsDirty(true);
  };

  const removeTarget = (index: number) => {
    if (form.targets.length <= 1) {
      onToast("warning", appText("builder.targets.empty"));
      return;
    }
    logUiAction("builder-target-remove", { index, countBefore: form.targets.length });
    setForm((current) => ({
      ...current,
      targets: current.targets.filter((_, targetIndex) => targetIndex !== index),
    }));
    if (activeTargetIndex >= index && activeTargetIndex > 0) {
      setActiveTargetIndex(activeTargetIndex - 1);
    }
    setIsDirty(true);
  };

  const ensureSessionId = (): string | null => {
    if (sessionId) {
      return sessionId;
    }
    logUiError("builder-session-missing");
    notify("error", "builder.sessionError");
    return null;
  };

  const openSaveChecklist = (intent: SaveIntent) => {
    const activeSessionId = ensureSessionId();
    if (!activeSessionId) {
      return;
    }
    logUiAction("builder-save-checklist-open", { intent, issueCount: allValidationIssues.length });
    if (allValidationIssues.length > 0) {
      const firstIssueStep = builderSteps.find((builderStep) => stepIssueMap[builderStep].length > 0);
      if (firstIssueStep) {
        setStep(firstIssueStep);
      }
      notify("warning", "builder.validation.blockedSave", { count: allValidationIssues.length });
    }
    setPendingSaveIntent(intent);
  };

  const replaceStagedAssets = (predicate: (item: StagedAsset) => boolean, nextItems: StagedAsset[]) => {
    setStagedAssets((current) => [...current.filter((item) => !predicate(item)), ...nextItems]);
  };

  const stageSelectedFiles = async (
    files: BuilderStagedFile[],
    assets: StagedAsset[],
    replace: (item: StagedAsset) => boolean,
  ) => {
    const activeSessionId = ensureSessionId();
    if (!activeSessionId) {
      return;
    }

    try {
      logUiAction("builder-stage-files-start", { count: files.length });
      await stageBuilderFiles(activeSessionId, files);
      replaceStagedAssets(replace, assets);
      setIsDirty(true);
      setStatusMessage(null);
      logUiAction("builder-stage-files-success", { count: files.length });
      notify("success", "builder.files.stagedSuccess", { count: files.length });
    } catch (error) {
      logUiError("builder-stage-files-failed", {
        count: files.length,
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.files.stageError");
    }
  };

  const handleCreateNew = async () => {
    logUiAction("builder-create-new-clicked", { hadSession: Boolean(sessionId), dirty: isDirty });
    setIsBusy(true);
    setStatusMessage(null);
    try {
      if (sessionId) {
        await discardBuilderSession(sessionId);
        if (isDirty) {
          notify("warning", "builder.sessionReplaced");
        }
      }
      const session = await createBuilderSession();
      logUiAction("builder-create-new-success", { sessionId: session.sessionId });
      setSessionId(session.sessionId);
      setOpenedPackageFile(null);
      setForm({
        ...defaultBuilderForm(),
        packageUuid: generateUuid(),
      });
      setActiveTargetIndex(0);
      setStagedAssets([]);
      setStep("interfaces");
      setMode("new");
      setIsDirty(true);
    } catch (error) {
      logUiError("builder-create-new-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.openError");
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenPackage = async () => {
    logUiAction("builder-open-package-clicked", { hadSession: Boolean(sessionId), dirty: isDirty });
    setIsBusy(true);
    setStatusMessage(null);

    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Yambuck package", extensions: ["yambuck"] }],
      });
      const packagePath = toPathList(selected)[0];
      if (!packagePath) {
        logUiAction("builder-open-package-cancelled");
        notify("info", "builder.openCancelled");
        return;
      }

      if (sessionId) {
        await discardBuilderSession(sessionId);
        if (isDirty) {
          notify("warning", "builder.sessionReplaced");
        }
      }

      const session = await openBuilderPackage(packagePath);
      const parsed = JSON.parse(session.manifestJson) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("invalid manifest");
      }

      const nextForm = formFromManifest(parsed as Record<string, unknown>);
      if (!nextForm.packageUuid.trim()) {
        nextForm.packageUuid = generateUuid();
      }
      setSessionId(session.sessionId);
      setOpenedPackageFile(session.packageFile ?? packagePath);
      setForm(nextForm);
      setActiveTargetIndex(0);
      setStagedAssets([]);
      setStep("interfaces");
      setMode("new");
      setIsDirty(false);
      logUiAction("builder-open-package-success", {
        file: fileBaseName(session.packageFile ?? packagePath),
        sessionId: session.sessionId,
      });
      onToast("success", `${appText("builder.openPackage")}: ${fileBaseName(session.packageFile ?? packagePath)}`);
    } catch (error) {
      logUiError("builder-open-package-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.openError");
    } finally {
      setIsBusy(false);
    }
  };

  const executeSaveAs = async () => {
    const activeSessionId = ensureSessionId();
    if (!activeSessionId) {
      return;
    }

    logUiAction("builder-save-as-clicked", { dirty: isDirty, issueCount: allValidationIssues.length });

    setIsBusy(true);
    setStatusMessage(null);

    try {
      const defaultFileName = openedPackageFile ? fileBaseName(openedPackageFile) : "package.yambuck";
      const outputPath = await save({
        defaultPath: defaultFileName,
        filters: [{ name: "Yambuck package", extensions: ["yambuck"] }],
      });
      if (!outputPath) {
        logUiAction("builder-save-as-cancelled");
        notify("info", "builder.saveCancelled");
        return;
      }

      const nextPackageUuid = generateUuid();
      const nextManifestPreview = buildManifestPreview(nextPackageUuid);
      await saveBuilderSessionAs(activeSessionId, outputPath, nextManifestPreview);
      setForm((current) => ({ ...current, packageUuid: nextPackageUuid }));
      setIsDirty(false);
      logUiAction("builder-save-as-success", { file: fileBaseName(outputPath) });
      notify("success", "builder.saveAsSuccess", { fileName: fileBaseName(outputPath) });
    } catch (error) {
      logUiError("builder-save-as-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      const detail = error instanceof Error ? error.message : "unknown";
      notify("error", "builder.saveErrorDetailed", { details: detail });
    } finally {
      setIsBusy(false);
    }
  };

  const executeSave = async () => {
    const activeSessionId = ensureSessionId();
    if (!activeSessionId) {
      return;
    }

    logUiAction("builder-save-clicked", {
      dirty: isDirty,
      hasOriginalPackage: Boolean(openedPackageFile),
      issueCount: allValidationIssues.length,
    });

    if (!openedPackageFile) {
      await executeSaveAs();
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    try {
      const nextPackageUuid = generateUuid();
      const nextManifestPreview = buildManifestPreview(nextPackageUuid);
      await saveBuilderSession(activeSessionId, nextManifestPreview);
      setForm((current) => ({ ...current, packageUuid: nextPackageUuid }));
      setIsDirty(false);
      logUiAction("builder-save-success", { file: fileBaseName(openedPackageFile) });
      notify("success", "builder.saveSuccess");
    } catch (error) {
      logUiError("builder-save-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      const detail = error instanceof Error ? error.message : "unknown";
      notify("error", "builder.saveErrorDetailed", { details: detail });
    } finally {
      setIsBusy(false);
    }
  };

  const continueSaveFromChecklist = async () => {
    if (!pendingSaveIntent || allValidationIssues.length > 0) {
      return;
    }
    const intent = pendingSaveIntent;
    setPendingSaveIntent(null);
    if (intent === "save") {
      await executeSave();
      return;
    }
    await executeSaveAs();
  };

  const browseIcon = async () => {
    logUiAction("builder-browse-icon-clicked");
    let sourcePath: string | undefined;
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg"] }],
      });
      sourcePath = toPathList(selected)[0];
    } catch (error) {
      logUiError("builder-browse-icon-dialog-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.files.stageError");
      return;
    }
    if (!sourcePath) {
      logUiAction("builder-browse-icon-cancelled");
      return;
    }

    const sourceName = fileBaseName(sourcePath);
    const extension = sourceName.includes(".") ? sourceName.slice(sourceName.lastIndexOf(".")).toLowerCase() : ".png";
    const targetPath = `assets/icon${extension}`;
    setField("iconPath", targetPath);

    await stageSelectedFiles(
      [{ sourcePath, targetPath }],
      [{ id: "icon", kind: "icon", sourceName, targetPath, sourcePath }],
      (item) => item.kind === "icon",
    );
  };

  const browseScreenshots = async () => {
    logUiAction("builder-browse-screenshots-clicked");
    const remainingSlots = builderMaxScreenshots - screenshotAssets.length;
    if (remainingSlots <= 0) {
      notify("info", "builder.files.screenshotLimitReached", { max: builderMaxScreenshots });
      return;
    }

    let sourcePaths: string[] = [];
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif"] }],
      });
      sourcePaths = toPathList(selected);
    } catch (error) {
      logUiError("builder-browse-screenshots-dialog-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.files.stageError");
      return;
    }
    if (sourcePaths.length === 0) {
      logUiAction("builder-browse-screenshots-cancelled");
      return;
    }

    const acceptedSourcePaths = sourcePaths.slice(0, remainingSlots);
    if (sourcePaths.length > acceptedSourcePaths.length) {
      notify("info", "builder.files.screenshotTrimmed", {
        accepted: acceptedSourcePaths.length,
        dropped: sourcePaths.length - acceptedSourcePaths.length,
        max: builderMaxScreenshots,
      });
    }

    const nextAssets = acceptedSourcePaths.map((sourcePath, index) => {
      const sourceName = fileBaseName(sourcePath);
      const normalizedName = sanitizeFileName(sourceName);
      return {
        id: `screenshot-${Date.now()}-${index}-${normalizedName}`,
        kind: "screenshot" as const,
        sourceName,
        targetPath: `assets/screenshots/${normalizedName}`,
        sourcePath,
      };
    });

    const mergedAssets = [...screenshotAssets, ...nextAssets];
    setField("screenshotsText", mergedAssets.map((item) => item.targetPath).join("\n"));
    await stageSelectedFiles(
      nextAssets.map((item, index) => ({
        sourcePath: acceptedSourcePaths[index],
        targetPath: item.targetPath,
      })),
      mergedAssets,
      (item) => item.kind === "screenshot",
    );
  };

  const browseBinary = async () => {
    if (!activeTarget) {
      notify("warning", "builder.targets.empty");
      return;
    }

    logUiAction("builder-browse-binary-clicked", {
      arch: activeTarget.arch,
      target: targetIdList[activeTargetIndex] ?? "unknown",
    });
    let sourcePath: string | undefined;
    try {
      const selected = await open({ multiple: false });
      sourcePath = toPathList(selected)[0];
    } catch (error) {
      logUiError("builder-browse-binary-dialog-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.files.stageError");
      return;
    }
    if (!sourcePath) {
      logUiAction("builder-browse-binary-cancelled");
      return;
    }

    const sourceName = fileBaseName(sourcePath);
    const binaryName = sanitizeFileName(sourceName);
    const entrypoint = `app/bin/${binaryName}`;
    const payloadRoot = payloadRootForTarget(activeTarget);
    const targetPath = `${payloadRoot}/${entrypoint}`;

    if (form.hasGui) {
      setTargetField(activeTargetIndex, "guiEntrypoint", entrypoint);
    }
    if (form.hasCli) {
      setTargetField(activeTargetIndex, "cliEntrypoint", entrypoint);
    }

    await stageSelectedFiles(
      [{ sourcePath, targetPath }],
      [{
        id: `binary-${activeTargetIndex}`,
        kind: "binary",
        sourceName,
        targetPath,
        arch: activeTarget.arch,
      }],
      (item) => item.kind === "binary" && item.id === `binary-${activeTargetIndex}`,
    );
  };

  const browseLicenseFile = async () => {
    logUiAction("builder-browse-license-clicked");
    let sourcePath: string | undefined;
    try {
      const selected = await open({ multiple: false });
      sourcePath = toPathList(selected)[0];
    } catch (error) {
      logUiError("builder-browse-license-dialog-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.files.stageError");
      return;
    }
    if (!sourcePath) {
      logUiAction("builder-browse-license-cancelled");
      return;
    }

    const sourceName = fileBaseName(sourcePath);
    const normalizedName = sanitizeFileName(sourceName);
    const targetPath = `assets/licenses/${normalizedName}`;
    if (!form.license.trim()) {
      setField("license", "Custom");
    }
    setField("licenseFile", targetPath);

    await stageSelectedFiles(
      [{ sourcePath, targetPath }],
      [{ id: "license", kind: "license", sourceName, targetPath, sourcePath }],
      (item) => item.kind === "license",
    );
  };

  const screenshotAssets = useMemo(
    () => stagedAssets.filter((item) => item.kind === "screenshot"),
    [stagedAssets],
  );

  const screenshotSlots = useMemo(
    () => Array.from({ length: builderMaxScreenshots }, (_, index) => screenshotAssets[index] ?? null),
    [screenshotAssets],
  );

  const iconPreviewSrc = useMemo(() => {
    const iconAsset = [...stagedAssets].reverse().find((item) => item.kind === "icon");
    if (iconAsset?.sourcePath) {
      try {
        return convertFileSrc(iconAsset.sourcePath);
      } catch {
        // fallback below
      }
    }
    return null;
  }, [stagedAssets]);

  const screenshotPreviewSrc = (asset: StagedAsset): string | null => {
    if (asset.sourcePath) {
      try {
        return convertFileSrc(asset.sourcePath);
      } catch {
        // fallback below
      }
    }
    return null;
  };

  const removeScreenshotAsset = (assetId: string) => {
    const nextAssets = stagedAssets.filter((item) => item.id !== assetId);
    const nextScreenshotPaths = nextAssets.filter((item) => item.kind === "screenshot").map((item) => item.targetPath);
    setStagedAssets(nextAssets);
    setField("screenshotsText", nextScreenshotPaths.join("\n"));
  };

  const clearIconAsset = () => {
    setStagedAssets((current) => current.filter((item) => item.kind !== "icon"));
    setField("iconPath", "");
  };

  const clearLicenseAsset = () => {
    setStagedAssets((current) => current.filter((item) => item.kind !== "license"));
    setField("licenseFile", "");
  };

  const viewLicenseText = async () => {
    const licenseAsset = [...stagedAssets].reverse().find((item) => item.kind === "license");
    if (!licenseAsset?.sourcePath) {
      notify("warning", "builder.files.licensePreviewUnavailable");
      return;
    }

    try {
      const response = await fetch(convertFileSrc(licenseAsset.sourcePath));
      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }
      const text = await response.text();
      setLicensePreviewText(text);
    } catch {
      notify("error", "builder.files.licensePreviewError");
    }
  };

  const renderTargetsEditor = () => {
    if (!activeTarget) {
      return <p class={sectionBody}>{appText("builder.targets.empty")}</p>;
    }

    return (
      <>
        <div class={targetListActions}>
          <h3 class={previewTitle}>{appText("builder.targets.title")}</h3>
          <Button onClick={addTarget} disabled={isBusy}>{appText("builder.targets.add")}</Button>
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
        <div class={targetList} role="list" aria-label={appText("builder.targets.listAria")}>
          {form.targets.map((target, index) => (
            <BuilderTargetCard
              key={`${targetIdList[index]}-${index}`}
              index={index}
              target={target}
              targetId={targetIdList[index] ?? ""}
              isActive={index === activeTargetIndex}
              canRemove={form.targets.length > 1}
              isBusy={isBusy}
              hasGui={form.hasGui}
              hasCli={form.hasCli}
              payloadRoot={payloadRootForTarget(target)}
              onToggle={() => {
                logUiAction("builder-target-select", { index, target: targetIdList[index] });
                setActiveTargetIndex(index === activeTargetIndex ? -1 : index);
              }}
              onRemove={() => removeTarget(index)}
              onBrowseBinary={() => void browseBinary()}
              onSetField={(key, value) => setTargetField(index, key, value)}
            />
          ))}
        </div>
        {renderStagedAssets(["binary"])}
      </>
    );
  };

  const renderStagedAssets = (kinds: StagedAsset["kind"][]) => {
    const visible = stagedAssets.filter((item) => kinds.includes(item.kind));
    return (
      <section>
        <h3 class={previewTitle}>{appText("builder.files.stagedTitle")}</h3>
        {visible.length === 0 ? <p class={sectionBody}>{appText("builder.files.stagedEmpty")}</p> : null}
        {visible.length > 0 ? (
          <ul class={stagedAssetList}>
            {visible.map((asset) => (
              <li key={asset.id} class={stagedAssetItem}>
                <div class={stagedAssetMeta}>
                  <strong>{appText(`builder.files.kind.${asset.kind}`)}</strong>
                  <span>{asset.sourceName}</span>
                  {asset.arch ? <span>{asset.arch}</span> : null}
                </div>
                <code class={stagedAssetPath}>{asset.targetPath}</code>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  };

  const hasFieldIssue = (key: string): boolean => Boolean(fieldIssues[key]);

  const stackClass = (key: string): string =>
    `${fieldStack}${hasFieldIssue(key) ? ` ${fieldStackInvalid}` : ""}`;

  const inputClass = (key: string): string | undefined =>
    hasFieldIssue(key) ? fieldInvalid : undefined;

  const renderCurrentStepIssues = () => {
    const issues = stepIssueMap[step];
    if (issues.length === 0) {
      return null;
    }
    return (
      <section class={stepIssuePanel}>
        <strong>{appText("builder.validation.title")}</strong>
        <ul class={stepIssueList}>
          {issues.map((issue) => (
            <li key={`step-${step}-${issue}`}>{issue}</li>
          ))}
        </ul>
      </section>
    );
  };

  const renderStepEditor = () => {
    if (step === "identity") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.identity")}</p>
          {renderCurrentStepIssues()}
          <label class={stackClass("appId")}>
            <BuilderFieldLabel label={appText("builder.fields.appId")} help={appText("builder.help.appId")} />
            <TextField class={inputClass("appId")} value={form.appId} onInput={(value) => setField("appId", value)} />
          </label>
          <label class={stackClass("appUuid")}>
            <BuilderFieldLabel label={appText("builder.fields.appUuid")} help={appText("builder.help.appUuid")} />
            <div class={fieldControlRow}>
              <TextField class={inputClass("appUuid")} value={form.appUuid} onInput={(value) => setField("appUuid", value)} />
              <Button onClick={requestGeneratedAppUuid} disabled={isBusy}>{appText("builder.generateUuid")}</Button>
            </div>
          </label>
          <label class={stackClass("packageUuid")}>
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
          {renderCurrentStepIssues()}
          <label class={stackClass("displayName")}>
            <BuilderFieldLabel label={appText("builder.fields.displayName")} help={appText("builder.help.displayName")} />
            <TextField class={inputClass("displayName")} value={form.displayName} onInput={(value) => setField("displayName", value)} />
          </label>
          <label class={stackClass("description")}>
            <BuilderFieldLabel label={appText("builder.fields.description")} help={appText("builder.help.description")} />
            <TextField class={inputClass("description")} value={form.description} onInput={(value) => setField("description", value)} />
          </label>
          <label class={stackClass("longDescription")}>
            <BuilderFieldLabel label={appText("builder.fields.longDescription")} help={appText("builder.help.longDescription")} />
            <textarea
              class={`${importTextarea}${inputClass("longDescription") ? ` ${inputClass("longDescription")}` : ""}`}
              value={form.longDescription}
              onInput={(event: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => setField("longDescription", event.currentTarget.value)}
            />
          </label>
          <label class={stackClass("version")}>
            <BuilderFieldLabel label={appText("builder.fields.version")} help={appText("builder.help.version")} />
            <TextField class={inputClass("version")} value={form.version} onInput={(value) => setField("version", value)} />
          </label>
          <label class={stackClass("publisher")}>
            <BuilderFieldLabel label={appText("builder.fields.publisher")} help={appText("builder.help.publisher")} />
            <TextField class={inputClass("publisher")} value={form.publisher} onInput={(value) => setField("publisher", value)} />
          </label>
          <label class={stackClass("homepageUrl")}>
            <BuilderFieldLabel label={appText("builder.fields.homepageUrl")} help={appText("builder.help.homepageUrl")} />
            <TextField class={inputClass("homepageUrl")} value={form.homepageUrl} onInput={(value) => setField("homepageUrl", value)} />
          </label>
          <label class={stackClass("supportUrl")}>
            <BuilderFieldLabel label={appText("builder.fields.supportUrl")} help={appText("builder.help.supportUrl")} />
            <TextField class={inputClass("supportUrl")} value={form.supportUrl} onInput={(value) => setField("supportUrl", value)} />
          </label>
          <label class={stackClass("license")}>
            <BuilderFieldLabel label={appText("builder.fields.license")} help={appText("builder.help.license")} />
            <TextField class={inputClass("license")} value={form.license} onInput={(value) => setField("license", value)} />
          </label>
        </div>
      );
    }

    if (step === "interfaces") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.interfaces")}</p>
          {renderCurrentStepIssues()}
          <CheckboxField class={`${compactCheckbox}${hasFieldIssue("hasGui") ? ` ${fieldStackInvalid}` : ""}`} checked={form.hasGui} onChange={(checked) => setField("hasGui", checked)}>{appText("builder.fields.hasGui")}</CheckboxField>
          <CheckboxField class={`${compactCheckbox}${hasFieldIssue("hasCli") ? ` ${fieldStackInvalid}` : ""}`} checked={form.hasCli} onChange={(checked) => setField("hasCli", checked)}>{appText("builder.fields.hasCli")}</CheckboxField>
          {form.hasCli ? (
            <>
              <label class={stackClass("commandName")}>
                <BuilderFieldLabel label={appText("builder.fields.commandName")} help={appText("builder.help.commandName")} />
                <TextField class={inputClass("commandName")} value={form.commandName} onInput={(value) => setField("commandName", value)} />
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
          {renderCurrentStepIssues()}
          {renderTargetsEditor()}
        </div>
      );
    }

    if (step === "assets") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.assets")}</p>
          {renderCurrentStepIssues()}
          <div class={`${assetSection} ${stackClass("iconPath")}`}>
            <BuilderFieldLabel label={appText("builder.fields.iconUpload")} help={appText("builder.help.iconUpload")} />
            <div class={assetActionRow}>
              <Button class={inlineActionButton} fullWidthOnSmall={false} onClick={() => void browseIcon()} disabled={isBusy}>{appText("builder.files.browseIcon")}</Button>
              {form.iconPath ? <Button onClick={clearIconAsset} disabled={isBusy}>{appText("builder.files.remove")}</Button> : null}
            </div>
          </div>
          <div class={`${assetSection} ${stackClass("screenshots")}`}>
            <BuilderFieldLabel label={appText("builder.fields.screenshotUpload")} help={appText("builder.help.screenshotUpload")} />
            <Button class={inlineActionButton} fullWidthOnSmall={false} onClick={() => void browseScreenshots()} disabled={isBusy}>{appText("builder.files.browseScreenshots")}</Button>
            <p class={sectionBody}>{appText("builder.files.screenshotSlots", { count: screenshotAssets.length, max: builderMaxScreenshots })}</p>
            <div class={assetThumbGrid}>
              {screenshotSlots.map((asset, index) => (
                <div key={asset ? asset.id : `screenshot-slot-${index}`} class={assetThumbTile}>
                  {asset && screenshotPreviewSrc(asset) ? (
                    <img class={assetThumbImage} src={screenshotPreviewSrc(asset)!} alt={appText("package.screenshot.alt", { index: index + 1 })} />
                  ) : (
                    <div class={assetThumbPlaceholder}>
                      <IconPhoto size={24} stroke={1.8} />
                      <span class={assetThumbSlotText}>{appText("builder.files.screenshotSlotEmpty", { index: index + 1 })}</span>
                    </div>
                  )}
                  {asset ? (
                    <button class={assetThumbRemove} type="button" onClick={() => removeScreenshotAsset(asset.id)} title={appText("builder.files.removeScreenshot")}>
                      <IconX size={14} stroke={2.4} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <p class={sectionBody}>{appText("builder.hints.screenshots", { count: screenshots.length, max: builderMaxScreenshots })}</p>
          <div class={`${assetSection} ${stackClass("licenseFile")}`}>
            <BuilderFieldLabel label={appText("builder.fields.licenseUpload")} help={appText("builder.help.licenseUpload")} />
            <div class={assetActionRow}>
              <Button class={inlineActionButton} fullWidthOnSmall={false} onClick={() => void browseLicenseFile()} disabled={isBusy}>{appText("builder.files.browseLicense")}</Button>
              {form.licenseFile ? <Button onClick={() => void viewLicenseText()} disabled={isBusy}>{appText("builder.files.viewLicense")}</Button> : null}
              {form.licenseFile ? <Button onClick={clearLicenseAsset} disabled={isBusy}>{appText("builder.files.remove")}</Button> : null}
            </div>
            {!form.licenseFile ? <p class={sectionBody}>{appText("builder.files.noneSelected")}</p> : null}
          </div>
          <CheckboxField
            checked={form.requiresLicenseAcceptance}
            onChange={(checked) => setField("requiresLicenseAcceptance", checked)}
          >
            {appText("builder.fields.requiresLicenseAcceptance")}
          </CheckboxField>
          {renderStagedAssets(["icon", "screenshot", "license"])}
        </div>
      );
    }

    return <p class={sectionBody}>{appText("builder.emptyReview")}</p>;
  };

  const selectStep = (nextStep: BuilderStep) => {
    logUiAction("builder-step-change", { from: step, to: nextStep });
    setStep(nextStep);
  };

  const goToPreviousStep = () => {
    if (currentStepIndex <= 0) {
      return;
    }
    selectStep(builderSteps[currentStepIndex - 1]);
  };

  const goToNextStep = () => {
    if (isFinalStep) {
      return;
    }
    const currentIssues = stepIssueMap[step];
    if (currentIssues.length > 0) {
      notify("warning", "builder.validation.blockedStep", {
        step: appText(`builder.steps.${step}`),
        count: currentIssues.length,
      });
      onToast("warning", currentIssues[0]);
      return;
    }
    selectStep(builderSteps[currentStepIndex + 1]);
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
            <Button variant="primary" onClick={() => void handleCreateNew()} disabled={isBusy}>{appText("builder.startNew")}</Button>
            <Button onClick={() => void handleOpenPackage()} disabled={isBusy}>{appText("builder.startExisting")}</Button>
          </div>
          {statusMessage ? <p class={field}>{statusMessage}</p> : null}
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
      <div class={actionBar}>
        <span class={statusBadge}>{isDirty ? appText("builder.dirty") : appText("builder.clean")}</span>
        <Button onClick={() => void handleOpenPackage()} disabled={isBusy}>{appText("builder.openPackage")}</Button>
      </div>
      {statusMessage ? <p class={field}>{statusMessage}</p> : null}

      <section class={workspace}>
        <WizardStepper
          steps={wizardSteps}
          currentStepId={currentStepperStep}
          align="center"
        />
        {renderStepEditor()}

        <div class={wizardFooter}>
          <div class={wizardFooterActions}>
            <Button onClick={() => (currentStepIndex === 0 ? confirmBackToStart() : goToPreviousStep())} disabled={isBusy}>{appText("builder.back")}</Button>
            {!isFinalStep ? (
              <Button variant="primary" onClick={goToNextStep} disabled={isBusy}>{appText("builder.next")}</Button>
            ) : (
              <>
                <Button onClick={() => setIsManifestModalOpen(true)} disabled={isBusy || !sessionId}>{appText("builder.previewOpen")}</Button>
                <Button onClick={() => openSaveChecklist("save")} disabled={isBusy || !sessionId || !openedPackageFile}>{appText("builder.save")}</Button>
                <Button onClick={() => openSaveChecklist("saveAs")} disabled={isBusy || !sessionId}>{appText("builder.saveAs")}</Button>
                <Button variant="primary" onClick={() => openSaveChecklist("build")} disabled={isBusy || !sessionId}>{appText("builder.build")}</Button>
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
        isBusy={isBusy}
        intent={pendingSaveIntent ?? "saveAs"}
        onClose={() => setPendingSaveIntent(null)}
        onContinue={() => void continueSaveFromChecklist()}
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
              <Button variant="danger" onClick={() => void handleDiscard()}>{appText("builder.confirmDiscard.discard")}</Button>
            </div>
          </section>
        </ModalShell>
      )}
    </Panel>
  );
};
