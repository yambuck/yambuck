import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { IconFileText, IconLayoutGrid, IconPhoto, IconPlus, IconX } from "@tabler/icons-preact";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { AccordionRow } from "../../components/ui/AccordionRow";
import { Panel } from "../../components/ui/Panel";
import { PanelHeader } from "../../components/ui/PanelHeader";
import { SelectField } from "../../components/ui/SelectField";
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
  validateBuilderSession,
} from "../../lib/tauri/api";
import type { BuilderStagedFile } from "../../types/app";
import {
  buildRuntimeDependencyIdList,
  buildTargetIdList,
  collectBuilderValidationResult,
  linuxDesktopListForTarget,
  payloadRootForTarget,
  sanitizeTargetSegment,
} from "./builderValidation";
import {
  builderMaxScreenshots,
  builderSteps,
  createBuilderRuntimeDependencyEditorId,
  createBuilderTargetEditorId,
  type BuilderArch,
  type BuilderFormState,
  type BuilderOs,
  type BuilderRuntimeDependencyCheck,
  type BuilderRuntimeDependencyOs,
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
  compactFieldStack,
  assetSection,
  compactCheckbox,
  descriptionTextarea,
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
  assetThumbGridCompact,
  assetThumbTile,
  assetThumbTileCompact,
  assetThumbImage,
  assetThumbPlaceholder,
  assetThumbAdd,
  assetThumbAddIcon,
  assetThumbDocIcon,
  assetThumbOpen,
  assetThumbSlotText,
  assetThumbRemove,
  startActions,
  startCard,
  statusBadge,
  targetList,
  targetAddButton,
  targetAddRow,
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

type ScreenshotSlot = {
  id: string;
  targetPath: string;
  sourceName: string;
  sourcePath?: string;
};

type PackageBuilderPageProps = {
  onToast: (tone: ToastTone, message: string, durationMs?: number) => void;
};

const defaultVariantForTarget = (os: BuilderOs, desktopEnvironment: BuilderTarget["desktopEnvironment"]): string => {
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

const defaultTarget = (arch: BuilderArch, index = 0): BuilderTarget => {
  const os: BuilderOs = "linux";
  const desktopEnvironment: BuilderTarget["desktopEnvironment"] = "all";
  return {
    editorId: createBuilderTargetEditorId(`target-${index + 1}`),
    os,
    arch,
    variant: defaultVariantForTarget(os, desktopEnvironment),
    desktopEnvironment,
    guiEntrypoint: "app/bin/example-app",
    cliEntrypoint: "app/bin/example-app",
  };
};

const normalizeTargetsForGuiToggle = (targets: BuilderTarget[], hasGui: boolean): BuilderTarget[] =>
  targets.map((target) => {
    if (target.os !== "linux") {
      return target;
    }
    if (!hasGui) {
      if (target.desktopEnvironment === "none") {
        return target;
      }
      return {
        ...target,
        desktopEnvironment: "none",
        variant: defaultVariantForTarget(target.os, "none"),
      };
    }
    if (target.desktopEnvironment === "none") {
      return {
        ...target,
        desktopEnvironment: "all",
        variant: defaultVariantForTarget(target.os, "all"),
      };
    }
    return target;
  });

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
  runtimeDependencyStrategy: "bundleFirst",
  runtimeDependencyChecks: [],
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

const normalizeOs = (value: unknown): BuilderOs => {
  if (value === "windows" || value === "macos") {
    return value;
  }
  return "linux";
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

type SupportedImageFormat = "png" | "jpeg" | "gif";
type ImageAssetKind = "icon" | "screenshot";

const iconAllowedExtensions = ["png", "jpg", "jpeg"];
const screenshotAllowedExtensions = ["png", "jpg", "jpeg", "gif"];
const iconMinBytes = 512;
const screenshotMinBytes = 1024;
const iconMinWidth = 128;
const iconMinHeight = 128;
const screenshotMinWidth = 256;
const screenshotMinHeight = 256;
const screenshotMinAspectRatio = 0.4;
const screenshotMaxAspectRatio = 2.5;

const imageExtensionFromPath = (path: string): string => {
  const base = fileBaseName(path).toLowerCase();
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === base.length - 1) {
    return "";
  }
  return base.slice(dotIndex + 1);
};

const detectImageFormat = (bytes: Uint8Array): SupportedImageFormat | null => {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "gif";
  }

  return null;
};

const extensionMatchesFormat = (extension: string, format: SupportedImageFormat): boolean => {
  if (format === "jpeg") {
    return extension === "jpg" || extension === "jpeg";
  }
  return extension === format;
};

const readImageDimensions = async (blob: Blob): Promise<{ width: number; height: number }> =>
  await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image decode failed"));
    };

    image.src = objectUrl;
  });

const parseScreenshotsText = (value: string): string[] =>
  value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);

const screenshotSlotsFromPaths = (paths: string[]): Array<ScreenshotSlot | null> => {
  const slots: Array<ScreenshotSlot | null> = Array.from({ length: builderMaxScreenshots }, () => null);
  paths.slice(0, builderMaxScreenshots).forEach((path, index) => {
    slots[index] = {
      id: `screenshot-existing-${index}-${sanitizeFileName(fileBaseName(path))}`,
      targetPath: path,
      sourceName: fileBaseName(path),
    };
  });
  return slots;
};

const screenshotPathsFromSlots = (slots: Array<ScreenshotSlot | null>): string[] =>
  slots.flatMap((slot) => (slot ? [slot.targetPath] : []));

const stagedScreenshotAssetsFromSlots = (slots: Array<ScreenshotSlot | null>): StagedAsset[] =>
  slots.flatMap((slot) => {
    if (!slot?.sourcePath) {
      return [];
    }
    return [{
      id: slot.id,
      kind: "screenshot" as const,
      sourceName: slot.sourceName,
      targetPath: slot.targetPath,
      sourcePath: slot.sourcePath,
    }];
  });

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
      const os = normalizeOs(target.os);
      const arch = normalizeArch(target.arch);
      const variant = firstNonEmpty(target.variant, defaultVariantForTarget(os, "all"));
      const linux = (target.linux ?? {}) as Record<string, unknown>;
      const desktops = Array.isArray(linux.desktopEnvironments)
        ? linux.desktopEnvironments.filter((item) => typeof item === "string").map((item) => item.toLowerCase())
        : [];

      let desktopEnvironment: BuilderTarget["desktopEnvironment"] = "all";
      if (desktops.length === 0) {
        desktopEnvironment = "none";
      }
      if (desktops.length === 1 && desktops[0] === "x11") {
        desktopEnvironment = "x11";
      }
      if (desktops.length === 1 && desktops[0] === "wayland") {
        desktopEnvironment = "wayland";
      }

      return {
        editorId: firstNonEmpty(target.id, createBuilderTargetEditorId(`target-${index + 1}`)),
        os,
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

const normalizeRuntimeDependencyOs = (value: unknown): BuilderRuntimeDependencyOs => {
  if (value === undefined) {
    return "any";
  }
  if (value === "linux" || value === "windows" || value === "macos") {
    return value;
  }
  throw new Error("runtimeDependencies.checks[].appliesTo.os must be linux, windows, or macos when provided");
};

const normalizeRuntimeDependencyChecks = (value: unknown): BuilderRuntimeDependencyCheck[] => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("runtimeDependencies.checks must be an array");
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`runtimeDependencies.checks[${index}] must be an object`);
    }

    const check = entry as Record<string, unknown>;
    const checkType = check.type;
    if (checkType !== "command" && checkType !== "file") {
      throw new Error(`runtimeDependencies.checks[${index}].type must be command or file`);
    }

    const severity = check.severity;
    if (severity !== "block" && severity !== "warn") {
      throw new Error(`runtimeDependencies.checks[${index}].severity must be block or warn`);
    }

    const appliesToValue = check.appliesTo;
    if (appliesToValue !== undefined && (!appliesToValue || typeof appliesToValue !== "object" || Array.isArray(appliesToValue))) {
      throw new Error(`runtimeDependencies.checks[${index}].appliesTo must be an object when provided`);
    }
    const appliesTo = (appliesToValue ?? {}) as Record<string, unknown>;
    const appliesToKeys = Object.keys(appliesTo);
    const unknownAppliesToKey = appliesToKeys.find((key) => key !== "os");
    if (unknownAppliesToKey) {
      throw new Error(`runtimeDependencies.checks[${index}].appliesTo.${unknownAppliesToKey} is not supported in v1`);
    }

    const allowedCommandKeys = new Set(["id", "type", "severity", "name", "message", "technicalHint", "appliesTo"]);
    const allowedFileKeys = new Set(["id", "type", "severity", "path", "mustBeExecutable", "message", "technicalHint", "appliesTo"]);
    const keys = Object.keys(check);
    for (const key of keys) {
      const allowed = checkType === "command" ? allowedCommandKeys : allowedFileKeys;
      if (!allowed.has(key)) {
        throw new Error(`runtimeDependencies.checks[${index}].${key} is not supported in v1`);
      }
    }

    if (checkType === "command" && typeof check.name !== "string") {
      throw new Error(`runtimeDependencies.checks[${index}].name must be a string for command checks`);
    }

    if (checkType === "file" && typeof check.path !== "string") {
      throw new Error(`runtimeDependencies.checks[${index}].path must be a string for file checks`);
    }

    if (check.mustBeExecutable !== undefined && typeof check.mustBeExecutable !== "boolean") {
      throw new Error(`runtimeDependencies.checks[${index}].mustBeExecutable must be a boolean when provided`);
    }

    return {
      editorId: createBuilderRuntimeDependencyEditorId(`runtime-check-${index + 1}`),
      id: asText(check.id),
      type: checkType,
      severity,
      commandName: asText(check.name),
      filePath: asText(check.path),
      mustBeExecutable: asBoolean(check.mustBeExecutable, false),
      appliesToOs: normalizeRuntimeDependencyOs(appliesTo.os),
      message: asText(check.message),
      technicalHint: asText(check.technicalHint),
    };
  });
};

const parseRuntimeDependencies = (value: unknown): Pick<BuilderFormState, "runtimeDependencyStrategy" | "runtimeDependencyChecks"> => {
  if (value === undefined) {
    return {
      runtimeDependencyStrategy: "bundleFirst",
      runtimeDependencyChecks: [],
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("runtimeDependencies must be an object when provided");
  }

  const runtimeDependencies = value as Record<string, unknown>;
  const allowedKeys = new Set(["strategy", "checks"]);
  for (const key of Object.keys(runtimeDependencies)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`runtimeDependencies.${key} is not supported in v1`);
    }
  }

  const strategy = runtimeDependencies.strategy;
  if (strategy !== "bundleFirst" && strategy !== "hostRequired") {
    throw new Error("runtimeDependencies.strategy must be bundleFirst or hostRequired");
  }

  return {
    runtimeDependencyStrategy: strategy,
    runtimeDependencyChecks: normalizeRuntimeDependencyChecks(runtimeDependencies.checks),
  };
};

const defaultRuntimeDependencyCheck = (): BuilderRuntimeDependencyCheck => ({
  editorId: createBuilderRuntimeDependencyEditorId(),
  id: "",
  type: "command",
  severity: "block",
  commandName: "",
  filePath: "",
  mustBeExecutable: false,
  appliesToOs: "linux",
  message: "",
  technicalHint: "",
});

const formFromManifest = (manifest: Record<string, unknown>): BuilderFormState => {
  const interfaces = (manifest.interfaces ?? {}) as Record<string, unknown>;
  const gui = (interfaces.gui ?? {}) as Record<string, unknown>;
  const cli = (interfaces.cli ?? {}) as Record<string, unknown>;
  const screenshots = normalizeScreenshots(manifest.screenshots);
  const runtimeDependencies = parseRuntimeDependencies(manifest.runtimeDependencies);

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
    runtimeDependencyStrategy: runtimeDependencies.runtimeDependencyStrategy,
    runtimeDependencyChecks: runtimeDependencies.runtimeDependencyChecks,
  };
};

export const PackageBuilderPage = ({ onToast }: PackageBuilderPageProps) => {
  const [mode, setMode] = useState<BuilderMode>("start");
  const [step, setStep] = useState<BuilderStep>(builderSteps[0]);
  const [form, setForm] = useState<BuilderFormState>(() => defaultBuilderForm());
  const [screenshotSlots, setScreenshotSlots] = useState<Array<ScreenshotSlot | null>>(() =>
    screenshotSlotsFromPaths(parseScreenshotsText(defaultBuilderForm().screenshotsText)),
  );
  const [activeTargetIndex, setActiveTargetIndex] = useState(-1);
  const [stagedAssets, setStagedAssets] = useState<StagedAsset[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [openedPackageFile, setOpenedPackageFile] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState(false);
  const [pendingSaveIntent, setPendingSaveIntent] = useState<SaveIntent | null>(null);
  const [licensePreviewText, setLicensePreviewText] = useState<string | null>(null);
  const [reviewValidationState, setReviewValidationState] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [reviewValidationMessage, setReviewValidationMessage] = useState<string | null>(null);
  const [validatedManifestSnapshot, setValidatedManifestSnapshot] = useState<string | null>(null);

  const notify = (tone: ToastTone, key: string, params?: Record<string, string | number>) => {
    const message = appText(key, params);
    setStatusMessage(message);
    onToast(tone, message);
  };

  const validateImageAssetSource = async (sourcePath: string, kind: ImageAssetKind): Promise<boolean> => {
    const sourceName = fileBaseName(sourcePath);
    const extension = imageExtensionFromPath(sourceName);
    const allowedExtensions = kind === "icon" ? iconAllowedExtensions : screenshotAllowedExtensions;

    if (!allowedExtensions.includes(extension)) {
      notify("warning", kind === "icon" ? "builder.files.validation.imageFormatIcon" : "builder.files.validation.imageFormatScreenshot");
      return false;
    }

    let blob: Blob;
    let bytes: Uint8Array;
    try {
      const response = await fetch(convertFileSrc(sourcePath));
      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }
      blob = await response.blob();
      bytes = new Uint8Array(await blob.arrayBuffer());
    } catch {
      notify("warning", "builder.files.validation.assetReadFailed", { file: sourceName });
      return false;
    }

    const detectedFormat = detectImageFormat(bytes);
    if (!detectedFormat) {
      notify("warning", "builder.files.validation.imageInvalid", { file: sourceName });
      return false;
    }

    if (!extensionMatchesFormat(extension, detectedFormat)) {
      notify("warning", "builder.files.validation.imageExtensionMismatch", { file: sourceName });
      return false;
    }

    const minBytes = kind === "icon" ? iconMinBytes : screenshotMinBytes;
    if (bytes.length < minBytes) {
      notify("warning", "builder.files.validation.imageMinBytes", {
        label: kind === "icon" ? appText("builder.files.validation.labelIcon") : appText("builder.files.validation.labelScreenshot"),
        size: bytes.length,
        min: minBytes,
      });
      return false;
    }

    let dimensions: { width: number; height: number };
    try {
      dimensions = await readImageDimensions(blob);
    } catch {
      notify("warning", "builder.files.validation.imageInvalid", { file: sourceName });
      return false;
    }

    const minWidth = kind === "icon" ? iconMinWidth : screenshotMinWidth;
    const minHeight = kind === "icon" ? iconMinHeight : screenshotMinHeight;
    if (dimensions.width < minWidth || dimensions.height < minHeight) {
      notify("warning", "builder.files.validation.imageMinDimensions", {
        label: kind === "icon" ? appText("builder.files.validation.labelIcon") : appText("builder.files.validation.labelScreenshot"),
        width: dimensions.width,
        height: dimensions.height,
        minWidth,
        minHeight,
      });
      return false;
    }

    if (kind === "screenshot") {
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio < screenshotMinAspectRatio || aspectRatio > screenshotMaxAspectRatio) {
        notify("warning", "builder.files.validation.screenshotAspect", {
          ratio: aspectRatio.toFixed(2),
        });
        return false;
      }
    }

    return true;
  };

  const validateLicenseTextSource = async (sourcePath: string): Promise<boolean> => {
    try {
      const response = await fetch(convertFileSrc(sourcePath));
      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }
      const text = await response.text();
      if (!text.trim()) {
        notify("warning", "builder.files.validation.licenseEmpty");
        return false;
      }
      return true;
    } catch {
      notify("warning", "builder.files.validation.licenseReadFailed");
      return false;
    }
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
      setActiveTargetIndex(-1);
      return;
    }
    if (activeTargetIndex >= form.targets.length) {
      setActiveTargetIndex(form.targets.length - 1);
    }
  }, [form.targets.length, activeTargetIndex]);

  useEffect(() => {
    if (step === "targets") {
      setActiveTargetIndex(-1);
    }
  }, [step]);

  const screenshots = useMemo(
    () => parseScreenshotsText(form.screenshotsText),
    [form.screenshotsText],
  );

  const targetIdList = useMemo(() => buildTargetIdList(form.targets), [form.targets]);
  const runtimeDependencyIdList = useMemo(
    () => buildRuntimeDependencyIdList(form.runtimeDependencyChecks),
    [form.runtimeDependencyChecks],
  );

  const validation = useMemo(
    () => collectBuilderValidationResult({ form, screenshots, t: appText }),
    [form, screenshots],
  );

  const reviewIssues = useMemo(() => {
    return form.targets.flatMap((target, index) => {
      const targetLabel = appText("builder.targets.item", { index: index + 1 });
      if (target.os !== "linux") {
        return [appText("builder.validation.targetOsUnsupported", {
          target: targetLabel,
          os: appText(`builder.targets.os.${target.os}`),
        })];
      }
      if (!form.hasGui && !form.hasCli) {
        return [];
      }
      const binaryAssetId = `binary-${target.editorId}`;
      const hasBinary = stagedAssets.some((item) => item.kind === "binary" && item.id === binaryAssetId);
      if (hasBinary) {
        return [];
      }
      return [appText("builder.validation.targetBinaryMissing", {
        target: targetLabel,
      })];
    });
  }, [form.hasCli, form.hasGui, form.targets, stagedAssets]);

  const stepIssueMap = useMemo(
    () => ({
      ...validation.stepIssues,
      review: [...validation.stepIssues.review, ...reviewIssues],
    }),
    [validation.stepIssues, reviewIssues],
  );
  const fieldIssues = validation.fieldIssues;

  const wizardSteps: WizardStepperStep[] = useMemo(() => [
    { id: "start", label: appText("builder.steps.start") },
    ...builderSteps.map((step) => ({ id: step, label: appText(`builder.steps.${step}`) })),
  ], []);

  const currentStepperStep = mode === "start" ? "start" : step;

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showAppUuidConfirm, setShowAppUuidConfirm] = useState(false);
  const [pendingTargetRemovalIndex, setPendingTargetRemovalIndex] = useState<number | null>(null);

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
    const nextForm = defaultBuilderForm();
    setForm(nextForm);
    setScreenshotSlots(screenshotSlotsFromPaths(parseScreenshotsText(nextForm.screenshotsText)));
    setActiveTargetIndex(-1);
    setReviewValidationState("idle");
    setReviewValidationMessage(null);
    setValidatedManifestSnapshot(null);
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
      targets: form.targets.map((target, index) => {
        const nextTarget: Record<string, unknown> = {
          id: targetIdList[index] ?? "",
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
          nextTarget.linux = {
            desktopEnvironments: linuxDesktopListForTarget(target),
          };
        }
        return nextTarget;
      }),
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

    if (form.runtimeDependencyChecks.length > 0) {
      nextManifest.runtimeDependencies = {
        strategy: form.runtimeDependencyStrategy,
        checks: form.runtimeDependencyChecks.map((check, index) => {
          const nextCheck: Record<string, unknown> = {
            id: runtimeDependencyIdList[index] ?? "",
            type: check.type,
            severity: check.severity,
            message: check.message.trim(),
          };

          if (check.technicalHint.trim()) {
            nextCheck.technicalHint = check.technicalHint.trim();
          }

          if (check.appliesToOs !== "any") {
            nextCheck.appliesTo = { os: check.appliesToOs };
          }

          if (check.type === "command") {
            nextCheck.name = check.commandName.trim();
          } else {
            nextCheck.path = check.filePath.trim();
            if (check.mustBeExecutable) {
              nextCheck.mustBeExecutable = true;
            }
          }

          return nextCheck;
        }),
      };
    }

    return JSON.stringify(nextManifest, null, 2);
  };

  const manifestPreview = useMemo(
    () => buildManifestPreview(),
    [form, screenshots, targetIdList, runtimeDependencyIdList],
  );
  const isManifestCurrentlyValidated = reviewValidationState === "passed" && validatedManifestSnapshot === manifestPreview;

  useEffect(() => {
    if (!validatedManifestSnapshot) {
      return;
    }
    if (validatedManifestSnapshot === manifestPreview) {
      return;
    }
    setReviewValidationState("idle");
    setReviewValidationMessage(null);
    setValidatedManifestSnapshot(null);
  }, [manifestPreview, validatedManifestSnapshot]);

  const setField = <Key extends keyof BuilderFormState>(key: Key, value: BuilderFormState[Key]) => {
    const detailValue = typeof value === "string" ? value.length : value ? 1 : 0;
    logUiAction("builder-field-change", { field: key, valueMetric: detailValue });
    setStatusMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  };

  const setHasGui = (checked: boolean) => {
    logUiAction("builder-field-change", { field: "hasGui", valueMetric: checked ? 1 : 0 });
    setStatusMessage(null);
    setForm((current) => ({
      ...current,
      hasGui: checked,
      targets: normalizeTargetsForGuiToggle(current.targets, checked),
    }));
    setIsDirty(true);
  };

  const setTargetField = <Key extends keyof BuilderTarget>(index: number, key: Key, value: BuilderTarget[Key]) => {
    logUiAction("builder-target-field-change", { index, field: key });
    setStatusMessage(null);
    setForm((current) => ({
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
    setIsDirty(true);
  };

  const setRuntimeDependencyField = <Key extends keyof BuilderRuntimeDependencyCheck>(
    index: number,
    key: Key,
    value: BuilderRuntimeDependencyCheck[Key],
  ) => {
    setStatusMessage(null);
    setForm((current) => ({
      ...current,
      runtimeDependencyChecks: current.runtimeDependencyChecks.map((check, checkIndex) => {
        if (checkIndex !== index) {
          return check;
        }
        return { ...check, [key]: value };
      }),
    }));
    setIsDirty(true);
  };

  const addRuntimeDependencyCheck = () => {
    setStatusMessage(null);
    setForm((current) => ({
      ...current,
      runtimeDependencyChecks: [...current.runtimeDependencyChecks, defaultRuntimeDependencyCheck()],
    }));
    setIsDirty(true);
  };

  const removeRuntimeDependencyCheck = (index: number) => {
    setStatusMessage(null);
    setForm((current) => ({
      ...current,
      runtimeDependencyChecks: current.runtimeDependencyChecks.filter((_, checkIndex) => checkIndex !== index),
    }));
    setIsDirty(true);
  };

  const addTarget = () => {
    const nextIndex = form.targets.length;
    const nextTarget = defaultTarget("x86_64", nextIndex);
    logUiAction("builder-target-add", { countBefore: form.targets.length });
    setForm((current) => ({ ...current, targets: [...current.targets, nextTarget] }));
    setActiveTargetIndex(-1);
    setIsDirty(true);
  };

  const removeTarget = (index: number) => {
    if (form.targets.length <= 1) {
      onToast("warning", appText("builder.targets.empty"));
      return;
    }
    logUiAction("builder-target-remove", { index, countBefore: form.targets.length });
    setForm((current) => {
      const targetToRemove = current.targets[index];
      if (targetToRemove) {
        const binaryAssetId = `binary-${targetToRemove.editorId}`;
        setStagedAssets((assets) => assets.filter((item) => item.id !== binaryAssetId));
      }
      return {
        ...current,
        targets: current.targets.filter((_, targetIndex) => targetIndex !== index),
      };
    });
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

  const runReviewValidation = async () => {
    const activeSessionId = ensureSessionId();
    if (!activeSessionId) {
      return;
    }
    if (allValidationIssues.length > 0) {
      const firstIssueStep = builderSteps.find((builderStep) => stepIssueMap[builderStep].length > 0);
      const firstIssue = firstIssueStep ? stepIssueMap[firstIssueStep][0] : null;
      if (firstIssueStep) {
        setStep(firstIssueStep);
      }
      if (firstIssue) {
        setStatusMessage(firstIssue);
        onToast("warning", firstIssue);
      }
      return;
    }

    setIsBusy(true);
    setReviewValidationState("running");
    setReviewValidationMessage(null);
    setStatusMessage(null);
    try {
      await validateBuilderSession(activeSessionId, manifestPreview);
      const message = appText("builder.review.validatePassed");
      setReviewValidationState("passed");
      setReviewValidationMessage(message);
      setValidatedManifestSnapshot(manifestPreview);
      setStatusMessage(message);
      onToast("success", message);
    } catch (error) {
      const details = error instanceof Error ? error.message : appText("builder.review.validateFailed");
      setReviewValidationState("failed");
      setReviewValidationMessage(details);
      setValidatedManifestSnapshot(null);
      setStatusMessage(details);
      onToast("error", details);
    } finally {
      setIsBusy(false);
    }
  };

  const replaceStagedAssets = (predicate: (item: StagedAsset) => boolean, nextItems: StagedAsset[]) => {
    setStagedAssets((current) => [...current.filter((item) => !predicate(item)), ...nextItems]);
  };

  const stageSelectedFiles = async (
    files: BuilderStagedFile[],
    assets: StagedAsset[],
    replace: (item: StagedAsset) => boolean,
  ): Promise<boolean> => {
    const activeSessionId = ensureSessionId();
    if (!activeSessionId) {
      return false;
    }

    try {
      logUiAction("builder-stage-files-start", { count: files.length });
      await stageBuilderFiles(activeSessionId, files);
      replaceStagedAssets(replace, assets);
      setIsDirty(true);
      setStatusMessage(null);
      logUiAction("builder-stage-files-success", { count: files.length });
      notify("success", "builder.files.stagedSuccess", { count: files.length });
      return true;
    } catch (error) {
      logUiError("builder-stage-files-failed", {
        count: files.length,
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.files.stageError");
      return false;
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
      const nextForm = {
        ...defaultBuilderForm(),
        packageUuid: generateUuid(),
      };
      setForm(nextForm);
      setScreenshotSlots(screenshotSlotsFromPaths(parseScreenshotsText(nextForm.screenshotsText)));
      setActiveTargetIndex(-1);
      setReviewValidationState("idle");
      setReviewValidationMessage(null);
      setValidatedManifestSnapshot(null);
      setStagedAssets([]);
      setStep(builderSteps[0]);
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
      setScreenshotSlots(screenshotSlotsFromPaths(parseScreenshotsText(nextForm.screenshotsText)));
      setActiveTargetIndex(-1);
      setReviewValidationState("idle");
      setReviewValidationMessage(null);
      setValidatedManifestSnapshot(null);
      setStagedAssets([]);
      setStep(builderSteps[0]);
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
      const detail = error instanceof Error ? error.message : appText("builder.openError");
      setStatusMessage(detail);
      onToast("error", detail);
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

    const iconValid = await validateImageAssetSource(sourcePath, "icon");
    if (!iconValid) {
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

  const browseScreenshotForSlot = async (slotIndex: number) => {
    logUiAction("builder-browse-screenshot-slot-clicked", { slot: slotIndex + 1 });
    let sourcePath: string | undefined;
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "gif"] }],
      });
      sourcePath = toPathList(selected)[0];
    } catch (error) {
      logUiError("builder-browse-screenshot-slot-dialog-failed", {
        error: error instanceof Error ? error.message : "unknown",
        slot: slotIndex + 1,
      });
      notify("error", "builder.files.stageError");
      return;
    }

    if (!sourcePath) {
      logUiAction("builder-browse-screenshot-slot-cancelled", { slot: slotIndex + 1 });
      return;
    }

    const screenshotValid = await validateImageAssetSource(sourcePath, "screenshot");
    if (!screenshotValid) {
      return;
    }

    const sourceName = fileBaseName(sourcePath);
    const normalizedName = sanitizeFileName(sourceName);
    const nextSlot: ScreenshotSlot = {
      id: `screenshot-${slotIndex}-${Date.now()}-${normalizedName}`,
      targetPath: `assets/screenshots/${normalizedName}`,
      sourceName,
      sourcePath,
    };
    const nextSlots = screenshotSlots.map((slot, index) => (index === slotIndex ? nextSlot : slot));
    const nextStagedAssets = stagedScreenshotAssetsFromSlots(nextSlots);

    const staged = await stageSelectedFiles(
      [{ sourcePath, targetPath: nextSlot.targetPath }],
      nextStagedAssets,
      (item) => item.kind === "screenshot",
    );
    if (!staged) {
      return;
    }

    setScreenshotSlots(nextSlots);
    setField("screenshotsText", screenshotPathsFromSlots(nextSlots).join("\n"));
  };

  const browseBinary = async (targetIndex: number) => {
    const selectedTarget = form.targets[targetIndex];
    if (!selectedTarget) {
      notify("warning", "builder.targets.empty");
      return;
    }

    logUiAction("builder-browse-binary-clicked", {
      arch: selectedTarget.arch,
      target: targetIdList[targetIndex] ?? "unknown",
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
    const payloadRoot = payloadRootForTarget(selectedTarget);
    const targetPath = `${payloadRoot}/${entrypoint}`;
    const binaryAssetId = `binary-${selectedTarget.editorId}`;

    if (form.hasGui) {
      setTargetField(targetIndex, "guiEntrypoint", entrypoint);
    }
    if (form.hasCli) {
      setTargetField(targetIndex, "cliEntrypoint", entrypoint);
    }

    await stageSelectedFiles(
      [{ sourcePath, targetPath }],
      [{
        id: binaryAssetId,
        kind: "binary",
        sourceName,
        targetPath,
        sourcePath,
        arch: selectedTarget.arch,
      }],
      (item) => item.kind === "binary" && item.id === binaryAssetId,
    );
  };

  const clearBinaryAsset = (targetIndex: number) => {
    const selectedTarget = form.targets[targetIndex];
    if (!selectedTarget) {
      return;
    }

    const binaryAssetId = `binary-${selectedTarget.editorId}`;
    setStagedAssets((current) => current.filter((item) => item.id !== binaryAssetId));
    if (form.hasGui) {
      setTargetField(targetIndex, "guiEntrypoint", "");
    }
    if (form.hasCli) {
      setTargetField(targetIndex, "cliEntrypoint", "");
    }
    setIsDirty(true);
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

    const licenseValid = await validateLicenseTextSource(sourcePath);
    if (!licenseValid) {
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

  const screenshotPreviewSrc = (slot: ScreenshotSlot): string | null => {
    if (slot.sourcePath) {
      try {
        return convertFileSrc(slot.sourcePath);
      } catch {
        // fallback below
      }
    }
    return null;
  };

  const removeScreenshotAtSlot = (slotIndex: number) => {
    const nextSlots = screenshotSlots.map((slot, index) => (index === slotIndex ? null : slot));
    setScreenshotSlots(nextSlots);
    setStagedAssets((current) => [
      ...current.filter((item) => item.kind !== "screenshot"),
      ...stagedScreenshotAssetsFromSlots(nextSlots),
    ]);
    setField("screenshotsText", screenshotPathsFromSlots(nextSlots).join("\n"));
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
    if (form.targets.length === 0) {
      return <p class={sectionBody}>{appText("builder.targets.empty")}</p>;
    }

    return (
      <>
        <div class={targetListActions}>
          <h3 class={previewTitle}>{appText("builder.targets.title")}</h3>
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
            <AccordionRow
              key={target.editorId}
              expanded={index === activeTargetIndex}
              titleText={`${appText(`builder.targets.os.${target.os}`)} / ${target.arch}${(form.hasGui && target.variant.trim() && target.variant.trim() !== "default") ? ` / ${target.variant.trim()}` : ""}`}
              subtitleText={target.os === "linux"
                ? (form.hasGui ? appText(`builder.targets.desktop.${target.desktopEnvironment}`) : appText("builder.targets.desktopInactiveCli"))
                : appText("builder.targets.osUnsupportedInline")}
              onToggle={() => {
                logUiAction("builder-target-select", { index, target: targetIdList[index] });
                setActiveTargetIndex(index === activeTargetIndex ? -1 : index);
              }}
            >
              <BuilderTargetCard
                target={target}
                isBusy={isBusy}
                hasGui={form.hasGui}
                hasCli={form.hasCli}
                binaryTargetPath={stagedAssets.find((asset) => asset.kind === "binary" && asset.id === `binary-${target.editorId}`)?.targetPath ?? null}
                binarySourceName={stagedAssets.find((asset) => asset.kind === "binary" && asset.id === `binary-${target.editorId}`)?.sourceName ?? null}
                onBrowseBinary={() => void browseBinary(index)}
                onClearBinary={() => clearBinaryAsset(index)}
                onSetField={(key, value) => setTargetField(index, key, value)}
              />
              <div class={targetListActions}>
                <span />
                <Button variant="danger" fullWidthOnSmall={false} onClick={() => setPendingTargetRemovalIndex(index)} disabled={isBusy || form.targets.length <= 1}>
                  {appText("builder.targets.remove")}
                </Button>
              </div>
            </AccordionRow>
          ))}
        </div>
        <div class={targetAddRow}>
          <button type="button" class={targetAddButton} onClick={addTarget} disabled={isBusy} title={appText("builder.targets.add")}>
            <span class={assetThumbAddIcon}><IconPlus size={16} stroke={2.6} /></span>
            <span>{appText("builder.targets.add")}</span>
          </button>
        </div>
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
          <label class={`${stackClass("displayName")} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.displayName")} help={appText("builder.help.displayName")} />
            <TextField class={inputClass("displayName")} value={form.displayName} onInput={(value) => setField("displayName", value)} />
          </label>
          <label class={stackClass("description")}>
            <BuilderFieldLabel label={appText("builder.fields.description")} help={appText("builder.help.description")} />
            <textarea
              class={`${descriptionTextarea}${inputClass("description") ? ` ${inputClass("description")}` : ""}`}
              value={form.description}
              onInput={(event: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => setField("description", event.currentTarget.value)}
            />
          </label>
          <label class={stackClass("longDescription")}>
            <BuilderFieldLabel label={appText("builder.fields.longDescription")} help={appText("builder.help.longDescription")} />
            <textarea
              class={`${importTextarea}${inputClass("longDescription") ? ` ${inputClass("longDescription")}` : ""}`}
              value={form.longDescription}
              onInput={(event: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => setField("longDescription", event.currentTarget.value)}
            />
          </label>
          <label class={`${stackClass("version")} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.version")} help={appText("builder.help.version")} />
            <TextField class={inputClass("version")} value={form.version} onInput={(value) => setField("version", value)} />
          </label>
          <label class={`${stackClass("publisher")} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.publisher")} help={appText("builder.help.publisher")} />
            <TextField class={inputClass("publisher")} value={form.publisher} onInput={(value) => setField("publisher", value)} />
          </label>
          <label class={`${stackClass("homepageUrl")} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.homepageUrl")} help={appText("builder.help.homepageUrl")} />
            <TextField class={inputClass("homepageUrl")} value={form.homepageUrl} onInput={(value) => setField("homepageUrl", value)} />
          </label>
          <label class={`${stackClass("supportUrl")} ${compactFieldStack}`}>
            <BuilderFieldLabel label={appText("builder.fields.supportUrl")} help={appText("builder.help.supportUrl")} />
            <TextField class={inputClass("supportUrl")} value={form.supportUrl} onInput={(value) => setField("supportUrl", value)} />
          </label>
        </div>
      );
    }

    if (step === "interfaces") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.interfaces")}</p>
          {renderCurrentStepIssues()}
          <CheckboxField class={`${compactCheckbox}${hasFieldIssue("hasGui") ? ` ${fieldStackInvalid}` : ""}`} checked={form.hasGui} onChange={setHasGui}>{appText("builder.fields.hasGui")}</CheckboxField>
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
            <div class={assetThumbGridCompact}>
              <div class={`${assetThumbTile} ${assetThumbTileCompact}`}>
                {iconPreviewSrc ? (
                  <img class={assetThumbImage} src={iconPreviewSrc} alt={appText("builder.fields.iconUpload")} />
                ) : form.iconPath ? (
                  <div class={assetThumbPlaceholder}>
                    <IconPhoto size={24} stroke={1.8} />
                    <span class={assetThumbSlotText}>{fileBaseName(form.iconPath)}</span>
                  </div>
                ) : null}
                {form.iconPath ? (
                  <button class={assetThumbRemove} type="button" onClick={clearIconAsset} title={appText("builder.files.remove")}>
                    <IconX size={14} stroke={2.4} />
                  </button>
                ) : (
                  <button
                    class={assetThumbAdd}
                    type="button"
                    onClick={() => void browseIcon()}
                    disabled={isBusy}
                    title={appText("builder.files.browseIcon")}
                  >
                    <span class={assetThumbAddIcon}><IconPlus size={16} stroke={2.6} /></span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div class={`${assetSection} ${stackClass("screenshots")}`}>
            <BuilderFieldLabel label={appText("builder.fields.screenshotUpload")} help={appText("builder.help.screenshotUpload")} />
            <div class={assetThumbGrid}>
              {screenshotSlots.map((asset, index) => (
                <div key={asset ? asset.id : `screenshot-slot-${index}`} class={assetThumbTile}>
                  {asset ? (screenshotPreviewSrc(asset) ? (
                    <img class={assetThumbImage} src={screenshotPreviewSrc(asset)!} alt={appText("package.screenshot.alt", { index: index + 1 })} />
                  ) : (
                    <div class={assetThumbPlaceholder}>
                      <IconPhoto size={24} stroke={1.8} />
                      <span class={assetThumbSlotText}>
                        {asset.sourceName}
                      </span>
                    </div>
                  )) : null}
                  {asset ? (
                    <button class={assetThumbRemove} type="button" onClick={() => removeScreenshotAtSlot(index)} title={appText("builder.files.removeScreenshot")}>
                      <IconX size={14} stroke={2.4} />
                    </button>
                  ) : (
                    <button
                      class={assetThumbAdd}
                      type="button"
                      onClick={() => void browseScreenshotForSlot(index)}
                      disabled={isBusy}
                      title={appText("builder.files.addScreenshotSlot", { index: index + 1 })}
                    >
                      <span class={assetThumbAddIcon}><IconPlus size={16} stroke={2.6} /></span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div class={`${assetSection} ${stackClass("licenseFile")}`}>
            <label class={`${fieldStack} ${compactFieldStack}`}>
              <BuilderFieldLabel label={appText("builder.fields.license")} help={appText("builder.help.license")} />
              <TextField value={form.license} onInput={(value) => setField("license", value)} />
            </label>
            <BuilderFieldLabel label={appText("builder.fields.licenseUpload")} help={appText("builder.help.licenseUpload")} />
            <div class={assetThumbGridCompact}>
              <div class={`${assetThumbTile} ${assetThumbTileCompact}`}>
                {form.licenseFile ? (
                  <>
                    <button class={assetThumbOpen} type="button" onClick={() => void viewLicenseText()} disabled={isBusy} title={appText("builder.files.viewLicense")}>
                      <div class={assetThumbPlaceholder}>
                        <span class={assetThumbDocIcon}><IconFileText size={56} stroke={1.8} /></span>
                      </div>
                    </button>
                    <button class={assetThumbRemove} type="button" onClick={clearLicenseAsset} title={appText("builder.files.remove")}>
                      <IconX size={14} stroke={2.4} />
                    </button>
                  </>
                ) : (
                  <button
                    class={assetThumbAdd}
                    type="button"
                    onClick={() => void browseLicenseFile()}
                    disabled={isBusy}
                    title={appText("builder.files.browseLicense")}
                  >
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
          {renderStagedAssets(["icon", "screenshot", "license"])}
        </div>
      );
    }

    if (step === "dependencies") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.dependencies")}</p>
          {renderCurrentStepIssues()}
          <section class={fieldStack}>
            <BuilderFieldLabel
              label={appText("builder.fields.runtimeDependencies")}
              help={appText("builder.help.runtimeDependencies")}
            />
            <p class={sectionBody}>{appText("builder.runtimeDependencies.nudge")}</p>
            <label class={`${fieldStack} ${compactFieldStack}`}>
              <BuilderFieldLabel
                label={appText("builder.fields.runtimeDependencyStrategy")}
                help={appText("builder.help.runtimeDependencyStrategy")}
              />
              <SelectField
                value={form.runtimeDependencyStrategy}
                options={[
                  { value: "bundleFirst", label: appText("builder.runtimeDependencies.strategy.bundleFirst") },
                  { value: "hostRequired", label: appText("builder.runtimeDependencies.strategy.hostRequired") },
                ]}
                onValueChange={(value: string) => setField("runtimeDependencyStrategy", value as BuilderFormState["runtimeDependencyStrategy"])}
              />
            </label>
            {form.runtimeDependencyChecks.map((check, index) => (
              <div key={check.editorId} class={fieldStack}>
                <strong>{appText("builder.runtimeDependencies.item", { index: index + 1 })}</strong>
                <div class={fieldGrid}>
                  <label class={`${fieldStack} ${compactFieldStack}`}>
                    <BuilderFieldLabel label={appText("builder.fields.runtimeDependencyType")} help={appText("builder.help.runtimeDependencies")} />
                    <SelectField
                      value={check.type}
                      options={[
                        { value: "command", label: appText("builder.runtimeDependencies.type.command") },
                        { value: "file", label: appText("builder.runtimeDependencies.type.file") },
                      ]}
                      onValueChange={(value: string) => setRuntimeDependencyField(index, "type", value as BuilderRuntimeDependencyCheck["type"])}
                    />
                  </label>
                  <label class={`${fieldStack} ${compactFieldStack}`}>
                    <BuilderFieldLabel label={appText("builder.fields.runtimeDependencySeverity")} help={appText("builder.help.runtimeDependencies")} />
                    <SelectField
                      value={check.severity}
                      options={[
                        { value: "block", label: appText("builder.runtimeDependencies.severity.block") },
                        { value: "warn", label: appText("builder.runtimeDependencies.severity.warn") },
                      ]}
                      onValueChange={(value: string) => setRuntimeDependencyField(index, "severity", value as BuilderRuntimeDependencyCheck["severity"])}
                    />
                  </label>
                  <label class={`${fieldStack} ${compactFieldStack}`}>
                    <BuilderFieldLabel label={appText("builder.fields.runtimeDependencyAppliesToOs")} help={appText("builder.help.runtimeDependencies")} />
                    <SelectField
                      value={check.appliesToOs}
                      options={[
                        { value: "any", label: appText("builder.runtimeDependencies.os.any") },
                        { value: "linux", label: appText("builder.runtimeDependencies.os.linux") },
                        { value: "windows", label: appText("builder.runtimeDependencies.os.windows") },
                        { value: "macos", label: appText("builder.runtimeDependencies.os.macos") },
                      ]}
                      onValueChange={(value: string) => setRuntimeDependencyField(index, "appliesToOs", value as BuilderRuntimeDependencyCheck["appliesToOs"])}
                    />
                  </label>
                </div>
                {check.type === "command" ? (
                  <label class={`${fieldStack} ${compactFieldStack}${hasFieldIssue(`runtimeDependency:${index}:commandName`) ? ` ${fieldStackInvalid}` : ""}`}>
                    <BuilderFieldLabel label={appText("builder.fields.runtimeDependencyCommandName")} help={appText("builder.help.runtimeDependencies")} />
                    <TextField
                      class={inputClass(`runtimeDependency:${index}:commandName`)}
                      value={check.commandName}
                      onInput={(value) => setRuntimeDependencyField(index, "commandName", value)}
                    />
                  </label>
                ) : (
                  <>
                    <label class={`${fieldStack} ${compactFieldStack}${hasFieldIssue(`runtimeDependency:${index}:filePath`) ? ` ${fieldStackInvalid}` : ""}`}>
                      <BuilderFieldLabel label={appText("builder.fields.runtimeDependencyFilePath")} help={appText("builder.help.runtimeDependencies")} />
                      <TextField
                        class={inputClass(`runtimeDependency:${index}:filePath`)}
                        value={check.filePath}
                        onInput={(value) => setRuntimeDependencyField(index, "filePath", value)}
                      />
                    </label>
                    <CheckboxField
                      class={compactCheckbox}
                      checked={check.mustBeExecutable}
                      onChange={(value) => setRuntimeDependencyField(index, "mustBeExecutable", value)}
                    >
                      {appText("builder.fields.runtimeDependencyMustBeExecutable")}
                    </CheckboxField>
                  </>
                )}
                <label class={`${fieldStack} ${compactFieldStack}${hasFieldIssue(`runtimeDependency:${index}:message`) ? ` ${fieldStackInvalid}` : ""}`}>
                  <BuilderFieldLabel label={appText("builder.fields.runtimeDependencyMessage")} help={appText("builder.help.runtimeDependencies")} />
                  <TextField
                    class={inputClass(`runtimeDependency:${index}:message`)}
                    value={check.message}
                    onInput={(value) => setRuntimeDependencyField(index, "message", value)}
                  />
                </label>
                <label class={`${fieldStack} ${compactFieldStack}`}>
                  <BuilderFieldLabel label={appText("builder.fields.runtimeDependencyTechnicalHint")} help={appText("builder.help.runtimeDependencies")} />
                  <TextField
                    value={check.technicalHint}
                    onInput={(value) => setRuntimeDependencyField(index, "technicalHint", value)}
                  />
                </label>
                <div class={targetListActions}>
                  <Button onClick={() => removeRuntimeDependencyCheck(index)} disabled={isBusy}>
                    {appText("builder.runtimeDependencies.remove")}
                  </Button>
                </div>
              </div>
            ))}
            <div class={targetAddRow}>
              <Button onClick={addRuntimeDependencyCheck} disabled={isBusy}>
                {appText("builder.runtimeDependencies.add")}
              </Button>
            </div>
          </section>
        </div>
      );
    }

    if (step === "review") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.review")}</p>
          {renderCurrentStepIssues()}
          <div class={wizardFooterActions}>
            <Button
              variant="primary"
              onClick={() => void runReviewValidation()}
              disabled={isBusy || reviewValidationState === "running"}
            >
              {reviewValidationState === "running" ? appText("builder.review.validating") : appText("builder.review.validate")}
            </Button>
          </div>
          {reviewValidationMessage ? <p class={sectionBody}>{reviewValidationMessage}</p> : null}
          {!isManifestCurrentlyValidated ? <p class={sectionBody}>{appText("builder.review.mustValidate")}</p> : null}
          <p class={sectionBody}>
            {appText("builder.review.runtimeDependenciesCount", { count: form.runtimeDependencyChecks.length })}
          </p>
          {form.runtimeDependencyChecks.length > 0 ? (
            <p class={sectionBody}>
              {appText("builder.review.runtimeDependenciesSeveritySummary", {
                blockers: form.runtimeDependencyChecks.filter((check) => check.severity === "block").length,
                warnings: form.runtimeDependencyChecks.filter((check) => check.severity === "warn").length,
              })}
            </p>
          ) : null}
          <p class={sectionBody}>{appText("builder.emptyReview")}</p>
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
    if (step === "targets" && reviewIssues.length > 0) {
      setStatusMessage(reviewIssues[0]);
      onToast("warning", reviewIssues[0]);
      return;
    }
    const currentIssues = stepIssueMap[step];
    if (currentIssues.length > 0) {
      setStatusMessage(currentIssues[0]);
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
                <Button variant="primary" onClick={() => openSaveChecklist("build")} disabled={isBusy || !sessionId || !isManifestCurrentlyValidated}>{appText("builder.build")}</Button>
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
      {pendingTargetRemovalIndex !== null ? (
        <ModalShell onClose={() => setPendingTargetRemovalIndex(null)}>
          <section>
            <h2>{appText("builder.targets.removeConfirmTitle")}</h2>
            <p>{appText("builder.targets.removeConfirmBody")}</p>
            <div class="modal-actions">
              <Button onClick={() => setPendingTargetRemovalIndex(null)}>{appText("builder.confirmDiscard.cancel")}</Button>
              <Button
                variant="danger"
                onClick={() => {
                  removeTarget(pendingTargetRemovalIndex);
                  setPendingTargetRemovalIndex(null);
                }}
              >
                {appText("builder.targets.remove")}
              </Button>
            </div>
          </section>
        </ModalShell>
      ) : null}
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
