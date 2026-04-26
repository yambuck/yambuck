import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
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
} from "../../lib/tauri/api";
import type { BuilderStagedFile } from "../../types/app";
import {
  actionBar,
  editorCard,
  field,
  fieldGrid,
  fieldLabel,
  fieldStack,
  importTextarea,
  pagePanel,
  previewCard,
  previewCode,
  previewTitle,
  sectionBody,
  stagedAssetItem,
  stagedAssetList,
  stagedAssetMeta,
  stagedAssetPath,
  stagedAssetsCard,
  startActions,
  startCard,
  statusBadge,
  stepButton,
  stepButtonActive,
  stepList,
  targetList,
  targetListActions,
  targetListItem,
  targetListItemActive,
  workspace,
  wipBanner,
} from "./packageBuilderPage.css";

type ToastTone = "info" | "success" | "warning" | "error";

type BuilderStep = "identity" | "metadata" | "interfaces" | "targets" | "assets" | "review";
type BuilderMode = "start" | "new";

type BuilderArch = "x86_64" | "aarch64" | "riscv64";

type BuilderTarget = {
  id: string;
  arch: BuilderArch;
  variant: string;
  payloadRoot: string;
  guiEntrypoint: string;
  cliEntrypoint: string;
};

type BuilderFormState = {
  appId: string;
  appUuid: string;
  packageUuid: string;
  displayName: string;
  description: string;
  longDescription: string;
  version: string;
  publisher: string;
  homepageUrl: string;
  supportUrl: string;
  license: string;
  licenseFile: string;
  requiresLicenseAcceptance: boolean;
  hasGui: boolean;
  hasCli: boolean;
  commandName: string;
  usageHint: string;
  iconPath: string;
  screenshotsText: string;
  targets: BuilderTarget[];
};

type StagedAsset = {
  id: string;
  kind: "icon" | "screenshot" | "binary" | "license";
  sourceName: string;
  targetPath: string;
  arch?: string;
};

type PackageBuilderPageProps = {
  onToast: (tone: ToastTone, message: string, durationMs?: number) => void;
};

const builderSteps: BuilderStep[] = ["identity", "metadata", "interfaces", "targets", "assets", "review"];

const defaultTarget = (arch: BuilderArch, index = 0): BuilderTarget => {
  const variant = "default";
  return {
    id: `linux-${arch}-${variant}-${index + 1}`,
    arch,
    variant,
    payloadRoot: `payloads/linux/${arch}/${variant}`,
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

      return {
        id: asText(target.id) || `linux-${arch}-${variant}-${index + 1}`,
        arch,
        variant,
        payloadRoot: asText(target.payloadRoot) || `payloads/linux/${arch}/${variant}`,
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
  const [step, setStep] = useState<BuilderStep>("identity");
  const [form, setForm] = useState<BuilderFormState>(() => defaultBuilderForm());
  const [activeTargetIndex, setActiveTargetIndex] = useState(0);
  const [stagedAssets, setStagedAssets] = useState<StagedAsset[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [openedPackageFile, setOpenedPackageFile] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

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
      targets: form.targets.map((target) => ({
        id: target.id,
        os: "linux",
        arch: target.arch,
        variant: target.variant.trim() || "default",
        payloadRoot: target.payloadRoot,
        entrypoints: {
          gui: target.guiEntrypoint,
          cli: target.cliEntrypoint,
        },
        linux: {
          desktopEnvironments: ["x11", "wayland"],
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
  }, [form, screenshots]);

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
      setForm(defaultBuilderForm());
      setActiveTargetIndex(0);
      setStagedAssets([]);
      setStep("identity");
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
      setSessionId(session.sessionId);
      setOpenedPackageFile(session.packageFile ?? packagePath);
      setForm(nextForm);
      setActiveTargetIndex(0);
      setStagedAssets([]);
      setStep("identity");
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

  const handleSaveAs = async () => {
    const activeSessionId = ensureSessionId();
    if (!activeSessionId) {
      return;
    }

    logUiAction("builder-save-as-clicked", { dirty: isDirty });

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

      await saveBuilderSessionAs(activeSessionId, outputPath, manifestPreview);
      setIsDirty(false);
      logUiAction("builder-save-as-success", { file: fileBaseName(outputPath) });
      notify("success", "builder.saveAsSuccess", { fileName: fileBaseName(outputPath) });
    } catch (error) {
      logUiError("builder-save-as-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.saveError");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = async () => {
    const activeSessionId = ensureSessionId();
    if (!activeSessionId) {
      return;
    }

    logUiAction("builder-save-clicked", { dirty: isDirty, hasOriginalPackage: Boolean(openedPackageFile) });

    if (!openedPackageFile) {
      await handleSaveAs();
      return;
    }

    setIsBusy(true);
    setStatusMessage(null);
    try {
      await saveBuilderSession(activeSessionId, manifestPreview);
      setIsDirty(false);
      logUiAction("builder-save-success", { file: fileBaseName(openedPackageFile) });
      notify("success", "builder.saveSuccess");
    } catch (error) {
      logUiError("builder-save-failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      notify("error", "builder.saveError");
    } finally {
      setIsBusy(false);
    }
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
      [{ id: "icon", kind: "icon", sourceName, targetPath }],
      (item) => item.kind === "icon",
    );
  };

  const browseScreenshots = async () => {
    logUiAction("builder-browse-screenshots-clicked");
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

    const nextAssets = sourcePaths.map((sourcePath, index) => {
      const sourceName = fileBaseName(sourcePath);
      const normalizedName = sanitizeFileName(sourceName);
      return {
        id: `screenshot-${index}-${normalizedName}`,
        kind: "screenshot" as const,
        sourceName,
        targetPath: `assets/screenshots/${normalizedName}`,
      };
    });

    setField("screenshotsText", nextAssets.map((item) => item.targetPath).join("\n"));
    await stageSelectedFiles(
      nextAssets.map((item, index) => ({
        sourcePath: sourcePaths[index],
        targetPath: item.targetPath,
      })),
      nextAssets,
      (item) => item.kind === "screenshot",
    );
  };

  const browseBinary = async () => {
    if (!activeTarget) {
      notify("warning", "builder.targets.empty");
      return;
    }

    logUiAction("builder-browse-binary-clicked", { arch: activeTarget.arch, target: activeTarget.id });
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
    const payloadRoot = activeTarget.payloadRoot || `payloads/linux/${activeTarget.arch}/${activeTarget.variant || "default"}`;
    const targetPath = `${payloadRoot}/${entrypoint}`;

    setTargetField(activeTargetIndex, "payloadRoot", payloadRoot);
    setTargetField(activeTargetIndex, "id", activeTarget.id || `linux-${activeTarget.arch}-${activeTarget.variant || "default"}`);
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
      [{ id: "license", kind: "license", sourceName, targetPath }],
      (item) => item.kind === "license",
    );
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
        <div class={targetList} role="tablist" aria-label={appText("builder.targets.listAria")}>
          {form.targets.map((target, index) => (
            <div key={`${target.id}-${index}`} class={targetListItem}>
              <button
                type="button"
                class={`${stepButton}${index === activeTargetIndex ? ` ${targetListItemActive}` : ""}`}
                onClick={() => {
                  logUiAction("builder-target-select", { index, target: target.id });
                  setActiveTargetIndex(index);
                }}
              >
                {appText("builder.targets.item", { index: index + 1 })} - {target.arch}
              </button>
              <Button onClick={() => removeTarget(index)} disabled={isBusy || form.targets.length <= 1}>
                {appText("builder.targets.remove")}
              </Button>
            </div>
          ))}
        </div>

        <label class={fieldStack}>
          <span class={fieldLabel}>{appText("builder.fields.targetId")}</span>
          <TextField value={activeTarget.id} onInput={(value) => setTargetField(activeTargetIndex, "id", value)} />
        </label>
        <label class={fieldStack}>
          <span class={fieldLabel}>{appText("builder.fields.arch")}</span>
          <SelectField
            value={activeTarget.arch}
            onValueChange={(value) => setTargetField(activeTargetIndex, "arch", value as BuilderArch)}
            options={[
              { value: "x86_64", label: "x86_64" },
              { value: "aarch64", label: "aarch64" },
              { value: "riscv64", label: "riscv64" },
            ]}
          />
        </label>
        <label class={fieldStack}>
          <span class={fieldLabel}>{appText("builder.fields.variant")}</span>
          <TextField value={activeTarget.variant} onInput={(value) => setTargetField(activeTargetIndex, "variant", value)} />
        </label>
        <label class={fieldStack}>
          <span class={fieldLabel}>{appText("builder.fields.payloadRoot")}</span>
          <TextField value={activeTarget.payloadRoot} onInput={(value) => setTargetField(activeTargetIndex, "payloadRoot", value)} />
        </label>
        <label class={fieldStack}>
          <span class={fieldLabel}>{appText("builder.fields.guiEntrypoint")}</span>
          <TextField value={activeTarget.guiEntrypoint} onInput={(value) => setTargetField(activeTargetIndex, "guiEntrypoint", value)} />
        </label>
        <label class={fieldStack}>
          <span class={fieldLabel}>{appText("builder.fields.cliEntrypoint")}</span>
          <TextField value={activeTarget.cliEntrypoint} onInput={(value) => setTargetField(activeTargetIndex, "cliEntrypoint", value)} />
        </label>
        <div class={fieldStack}>
          <span class={fieldLabel}>{appText("builder.fields.binaryUpload")}</span>
          <Button onClick={() => void browseBinary()} disabled={isBusy}>{appText("builder.files.browseBinary")}</Button>
        </div>
      </>
    );
  };

  const renderStepEditor = () => {
    if (step === "identity") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.identity")}</p>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.appId")}</span>
            <TextField value={form.appId} onInput={(value) => setField("appId", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.appUuid")}</span>
            <TextField value={form.appUuid} onInput={(value) => setField("appUuid", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.packageUuid")}</span>
            <TextField value={form.packageUuid} onInput={(value) => setField("packageUuid", value)} />
          </label>
        </div>
      );
    }

    if (step === "metadata") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.metadata")}</p>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.displayName")}</span>
            <TextField value={form.displayName} onInput={(value) => setField("displayName", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.description")}</span>
            <TextField value={form.description} onInput={(value) => setField("description", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.longDescription")}</span>
            <textarea
              class={importTextarea}
              value={form.longDescription}
              onInput={(event: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => setField("longDescription", event.currentTarget.value)}
            />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.version")}</span>
            <TextField value={form.version} onInput={(value) => setField("version", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.publisher")}</span>
            <TextField value={form.publisher} onInput={(value) => setField("publisher", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.homepageUrl")}</span>
            <TextField value={form.homepageUrl} onInput={(value) => setField("homepageUrl", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.supportUrl")}</span>
            <TextField value={form.supportUrl} onInput={(value) => setField("supportUrl", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.license")}</span>
            <TextField value={form.license} onInput={(value) => setField("license", value)} />
          </label>
        </div>
      );
    }

    if (step === "interfaces") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.interfaces")}</p>
          <CheckboxField checked={form.hasGui} onChange={(checked) => setField("hasGui", checked)}>{appText("builder.fields.hasGui")}</CheckboxField>
          <CheckboxField checked={form.hasCli} onChange={(checked) => setField("hasCli", checked)}>{appText("builder.fields.hasCli")}</CheckboxField>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.commandName")}</span>
            <TextField value={form.commandName} onInput={(value) => setField("commandName", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.usageHint")}</span>
            <TextField value={form.usageHint} onInput={(value) => setField("usageHint", value)} />
          </label>
        </div>
      );
    }

    if (step === "targets") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.targets")}</p>
          {renderTargetsEditor()}
        </div>
      );
    }

    if (step === "assets") {
      return (
        <div class={fieldGrid}>
          <p class={sectionBody}>{appText("builder.section.assets")}</p>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.iconPath")}</span>
            <TextField value={form.iconPath} onInput={(value) => setField("iconPath", value)} />
          </label>
          <div class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.iconUpload")}</span>
            <Button onClick={() => void browseIcon()} disabled={isBusy}>{appText("builder.files.browseIcon")}</Button>
          </div>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.screenshots")}</span>
            <textarea
              class={importTextarea}
              value={form.screenshotsText}
              onInput={(event: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => setField("screenshotsText", event.currentTarget.value)}
            />
          </label>
          <div class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.screenshotUpload")}</span>
            <Button onClick={() => void browseScreenshots()} disabled={isBusy}>{appText("builder.files.browseScreenshots")}</Button>
          </div>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.licenseFile")}</span>
            <TextField value={form.licenseFile} onInput={(value) => setField("licenseFile", value)} />
          </label>
          <div class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.licenseUpload")}</span>
            <Button onClick={() => void browseLicenseFile()} disabled={isBusy}>{appText("builder.files.browseLicense")}</Button>
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

  const selectStep = (nextStep: BuilderStep) => {
    logUiAction("builder-step-change", { from: step, to: nextStep });
    setStep(nextStep);
  };

  if (mode === "start") {
    return (
      <Panel class={pagePanel}>
        <PanelHeader title={appText("builder.title")}>{appText("builder.subtitle")}</PanelHeader>
        <section class={wipBanner}>
          <h2>{appText("builder.wip.title")}</h2>
          <p>{appText("builder.wip.body")}</p>
        </section>
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
      <PanelHeader title={appText("builder.title")}>{appText("builder.subtitle")}</PanelHeader>

      <section class={wipBanner}>
        <h2>{appText("builder.wip.title")}</h2>
        <p>{appText("builder.wip.body")}</p>
      </section>

      <div class={actionBar}>
        <span class={statusBadge}>{isDirty ? appText("builder.dirty") : appText("builder.clean")}</span>
        <Button onClick={() => void handleOpenPackage()} disabled={isBusy}>{appText("builder.openPackage")}</Button>
        <Button onClick={() => void handleSave()} disabled={isBusy || !sessionId || !openedPackageFile}>{appText("builder.save")}</Button>
        <Button variant="primary" onClick={() => void handleSaveAs()} disabled={isBusy || !sessionId}>{appText("builder.saveAs")}</Button>
      </div>
      {statusMessage ? <p class={field}>{statusMessage}</p> : null}

      <section class={workspace}>
        <nav class={stepList} aria-label={appText("builder.steps.aria")}>
          {builderSteps.map((item) => (
            <button
              type="button"
              key={item}
              class={`${stepButton}${item === step ? ` ${stepButtonActive}` : ""}`}
              onClick={() => selectStep(item)}
            >
              {appText(`builder.steps.${item}`)}
            </button>
          ))}
        </nav>
        <div class={editorCard}>
          {renderStepEditor()}
        </div>
        <aside class={previewCard}>
          <h3 class={previewTitle}>{appText("builder.previewTitle")}</h3>
          <pre class={previewCode}>{manifestPreview}</pre>
        </aside>
      </section>

      <section class={stagedAssetsCard}>
        <h3 class={previewTitle}>{appText("builder.files.stagedTitle")}</h3>
        {stagedAssets.length === 0 ? <p class={sectionBody}>{appText("builder.files.stagedEmpty")}</p> : null}
        {stagedAssets.length > 0 ? (
          <ul class={stagedAssetList}>
            {stagedAssets.map((asset) => (
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
    </Panel>
  );
};
