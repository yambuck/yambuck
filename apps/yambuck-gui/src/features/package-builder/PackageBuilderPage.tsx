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
  workspace,
} from "./packageBuilderPage.css";

type ToastTone = "info" | "success" | "warning" | "error";

type BuilderStep = "identity" | "metadata" | "interfaces" | "targets" | "assets" | "review";
type BuilderMode = "start" | "new";

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
  hasGui: boolean;
  hasCli: boolean;
  commandName: string;
  usageHint: string;
  targetId: string;
  arch: "x86_64" | "aarch64" | "riscv64";
  variant: string;
  payloadRoot: string;
  guiEntrypoint: string;
  cliEntrypoint: string;
  iconPath: string;
  screenshotsText: string;
};

type StagedAsset = {
  id: string;
  kind: "icon" | "screenshot" | "binary";
  sourceName: string;
  targetPath: string;
  arch?: string;
};

const builderSteps: BuilderStep[] = ["identity", "metadata", "interfaces", "targets", "assets", "review"];

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
  hasGui: true,
  hasCli: false,
  commandName: "",
  usageHint: "",
  targetId: "linux-x86_64-default",
  arch: "x86_64",
  variant: "default",
  payloadRoot: "payloads/linux/x86_64/default",
  guiEntrypoint: "app/bin/example-app",
  cliEntrypoint: "app/bin/example-app",
  iconPath: "assets/icon.png",
  screenshotsText: "assets/screenshots/screenshot-a.png",
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

const normalizeArch = (value: unknown): BuilderFormState["arch"] => {
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

const formFromManifest = (manifest: Record<string, unknown>): BuilderFormState => {
  const interfaces = (manifest.interfaces ?? {}) as Record<string, unknown>;
  const gui = (interfaces.gui ?? {}) as Record<string, unknown>;
  const cli = (interfaces.cli ?? {}) as Record<string, unknown>;
  const targets = Array.isArray(manifest.targets) ? manifest.targets : [];
  const firstTarget = (targets[0] ?? {}) as Record<string, unknown>;
  const entrypoints = (firstTarget.entrypoints ?? {}) as Record<string, unknown>;
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
    hasGui: asBoolean(gui.enabled, true),
    hasCli: asBoolean(cli.enabled, false),
    commandName: asText(cli.commandName),
    usageHint: asText(cli.usageHint),
    targetId: asText(firstTarget.id) || "linux-x86_64-default",
    arch: normalizeArch(firstTarget.arch),
    variant: firstNonEmpty(firstTarget.variant, "default"),
    payloadRoot: asText(firstTarget.payloadRoot) || "payloads/linux/x86_64/default",
    guiEntrypoint: firstNonEmpty(entrypoints.gui, manifest.entrypoint),
    cliEntrypoint: firstNonEmpty(entrypoints.cli, manifest.entrypoint),
    iconPath: asText(manifest.iconPath),
    screenshotsText: screenshots.join("\n"),
  };
};

type PackageBuilderPageProps = {
  onToast: (tone: ToastTone, message: string, durationMs?: number) => void;
};

export const PackageBuilderPage = ({ onToast }: PackageBuilderPageProps) => {
  const [mode, setMode] = useState<BuilderMode>("start");
  const [step, setStep] = useState<BuilderStep>("identity");
  const [form, setForm] = useState<BuilderFormState>(() => defaultBuilderForm());
  const [stagedAssets, setStagedAssets] = useState<StagedAsset[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [openedPackageFile, setOpenedPackageFile] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

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

  const screenshots = useMemo(
    () => form.screenshotsText.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean),
    [form.screenshotsText],
  );

  const manifestPreview = useMemo(() => {
    const variant = form.variant.trim() || "default";
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
      targets: [
        {
          id: form.targetId,
          os: "linux",
          arch: form.arch,
          variant,
          payloadRoot: form.payloadRoot,
          entrypoints: {
            gui: form.guiEntrypoint,
            cli: form.cliEntrypoint,
          },
          linux: {
            desktopEnvironments: ["x11", "wayland"],
          },
        },
      ],
    };

    if (form.homepageUrl.trim()) {
      nextManifest.homepageUrl = form.homepageUrl;
    }
    if (form.supportUrl.trim()) {
      nextManifest.supportUrl = form.supportUrl;
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

  const stageSelectedFiles = async (files: BuilderStagedFile[], assets: StagedAsset[], replace: (item: StagedAsset) => boolean) => {
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

      setSessionId(session.sessionId);
      setOpenedPackageFile(session.packageFile ?? packagePath);
      setForm(formFromManifest(parsed as Record<string, unknown>));
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
      logUiAction("builder-save-success", { file: openedPackageFile ? fileBaseName(openedPackageFile) : "none" });
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

    const baseName = fileBaseName(sourcePath);
    const extension = baseName.includes(".") ? baseName.slice(baseName.lastIndexOf(".")).toLowerCase() : ".png";
    const targetPath = `assets/icon${extension}`;
    setField("iconPath", targetPath);
    await stageSelectedFiles(
      [{ sourcePath, targetPath }],
      [{ id: "icon", kind: "icon", sourceName: baseName, targetPath }],
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
    logUiAction("builder-browse-binary-clicked", { arch: form.arch });
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

    const variant = form.variant.trim() || "default";
    const payloadRoot = `payloads/linux/${form.arch}/${variant}`;
    const sourceName = fileBaseName(sourcePath);
    const binaryName = sanitizeFileName(sourceName);
    const entrypoint = `app/bin/${binaryName}`;
    const targetPath = `${payloadRoot}/${entrypoint}`;

    setField("payloadRoot", payloadRoot);
    setField("targetId", `linux-${form.arch}-${variant}`);
    if (form.hasGui) {
      setField("guiEntrypoint", entrypoint);
    }
    if (form.hasCli) {
      setField("cliEntrypoint", entrypoint);
    }

    await stageSelectedFiles(
      [{ sourcePath, targetPath }],
      [{
        id: `binary-${form.arch}-${variant}`,
        kind: "binary",
        sourceName,
        targetPath,
        arch: form.arch,
      }],
      (item) => item.kind === "binary" && item.id === `binary-${form.arch}-${variant}`,
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
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.targetId")}</span>
            <TextField value={form.targetId} onInput={(value) => setField("targetId", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.arch")}</span>
            <SelectField
              value={form.arch}
              onValueChange={(value) => setField("arch", value as BuilderFormState["arch"])}
              options={[
                { value: "x86_64", label: "x86_64" },
                { value: "aarch64", label: "aarch64" },
                { value: "riscv64", label: "riscv64" },
              ]}
            />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.variant")}</span>
            <TextField value={form.variant} onInput={(value) => setField("variant", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.payloadRoot")}</span>
            <TextField value={form.payloadRoot} onInput={(value) => setField("payloadRoot", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.guiEntrypoint")}</span>
            <TextField value={form.guiEntrypoint} onInput={(value) => setField("guiEntrypoint", value)} />
          </label>
          <label class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.cliEntrypoint")}</span>
            <TextField value={form.cliEntrypoint} onInput={(value) => setField("cliEntrypoint", value)} />
          </label>
          <div class={fieldStack}>
            <span class={fieldLabel}>{appText("builder.fields.binaryUpload")}</span>
            <Button onClick={() => void browseBinary()} disabled={isBusy}>{appText("builder.files.browseBinary")}</Button>
          </div>
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
