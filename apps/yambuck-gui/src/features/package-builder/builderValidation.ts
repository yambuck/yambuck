import {
  builderMaxScreenshots,
  builderMinScreenshots,
  type BuilderFormState,
  type BuilderStep,
  type BuilderTarget,
} from "./builderTypes";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export const sanitizeTargetSegment = (value: string, fallback: string): string => {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || fallback;
};

export const payloadRootForTarget = (target: BuilderTarget): string => {
  const variant = sanitizeTargetSegment(target.variant, "default");
  return `payloads/${target.os}/${target.arch}/${variant}`;
};

export const linuxDesktopListForTarget = (target: BuilderTarget): string[] => {
  if (target.os !== "linux") {
    return [];
  }
  if (target.desktopEnvironment === "none") {
    return [];
  }
  if (target.desktopEnvironment === "x11") {
    return ["x11"];
  }
  if (target.desktopEnvironment === "wayland") {
    return ["wayland"];
  }
  return ["x11", "wayland"];
};

export const buildTargetIdList = (targets: BuilderTarget[]): string[] => {
  const counts = new Map<string, number>();
  return targets.map((target) => {
    const variant = sanitizeTargetSegment(target.variant, "default");
    const desktopScope = target.os === "linux" && target.desktopEnvironment !== "all" ? `-${target.desktopEnvironment}` : "";
    const base = `${target.os}-${target.arch}-${variant}${desktopScope}`;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  });
};

const isValidHttpsUrl = (value: string): boolean => {
  if (!value.trim()) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidSemverVersion = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semverPattern.test(trimmed);
};

type CollectBuilderValidationArgs = {
  form: BuilderFormState;
  screenshots: string[];
  t: Translate;
};

export type StepIssueMap = Record<BuilderStep, string[]>;
export type FieldIssueMap = Record<string, boolean>;

export type BuilderValidationResult = {
  stepIssues: StepIssueMap;
  fieldIssues: FieldIssueMap;
};

const markIssue = (fieldIssues: FieldIssueMap, key: string) => {
  fieldIssues[key] = true;
};

export const collectBuilderValidationResult = ({ form, screenshots, t }: CollectBuilderValidationArgs): BuilderValidationResult => {
  const fieldIssues: FieldIssueMap = {};
  const identityIssues: string[] = [];
  if (!form.appId.trim()) {
    identityIssues.push(t("builder.validation.missingAppId"));
    markIssue(fieldIssues, "appId");
  }
  if (!form.appUuid.trim()) {
    identityIssues.push(t("builder.validation.missingAppUuid"));
    markIssue(fieldIssues, "appUuid");
  }
  if (!form.packageUuid.trim()) {
    identityIssues.push(t("builder.validation.missingPackageUuid"));
    markIssue(fieldIssues, "packageUuid");
  }

  const metadataIssues: string[] = [];
  if (!form.displayName.trim()) {
    metadataIssues.push(t("builder.validation.missingDisplayName"));
    markIssue(fieldIssues, "displayName");
  }
  if (!form.description.trim()) {
    metadataIssues.push(t("builder.validation.missingDescription"));
    markIssue(fieldIssues, "description");
  }
  if (!form.longDescription.trim()) {
    metadataIssues.push(t("builder.validation.missingLongDescription"));
    markIssue(fieldIssues, "longDescription");
  }
  if (!form.version.trim()) {
    metadataIssues.push(t("builder.validation.missingVersion"));
    markIssue(fieldIssues, "version");
  } else if (!isValidSemverVersion(form.version)) {
    metadataIssues.push(t("builder.validation.invalidVersion"));
    markIssue(fieldIssues, "version");
  }
  if (!form.publisher.trim()) {
    metadataIssues.push(t("builder.validation.missingPublisher"));
    markIssue(fieldIssues, "publisher");
  }
  if (!isValidHttpsUrl(form.homepageUrl)) {
    metadataIssues.push(t("builder.validation.invalidHomepageUrl"));
    markIssue(fieldIssues, "homepageUrl");
  }
  if (!isValidHttpsUrl(form.supportUrl)) {
    metadataIssues.push(t("builder.validation.invalidSupportUrl"));
    markIssue(fieldIssues, "supportUrl");
  }

  const interfaceIssues: string[] = [];
  if (!form.hasGui && !form.hasCli) {
    interfaceIssues.push(t("builder.validation.interfaceRequired"));
    markIssue(fieldIssues, "hasGui");
    markIssue(fieldIssues, "hasCli");
  }
  if (form.hasCli && !form.commandName.trim()) {
    interfaceIssues.push(t("builder.validation.cliCommandRequired"));
    markIssue(fieldIssues, "commandName");
  }

  const targetIssues: string[] = [];
  const tupleIndexes = new Map<string, number>();
  for (let index = 0; index < form.targets.length; index += 1) {
    const target = form.targets[index];
    const label = t("builder.targets.item", { index: index + 1 });
    const variant = sanitizeTargetSegment(target.variant, "default");

    if (target.variant.trim().length === 0) {
      targetIssues.push(t("builder.validation.targetVariantRequired", { target: label }));
      markIssue(fieldIssues, `target:${index}:variant`);
    }

    const tupleKey = `${target.os}/${target.arch}/${variant}`;
    const existingIndex = tupleIndexes.get(tupleKey);
    if (existingIndex !== undefined) {
      targetIssues.push(t("builder.validation.duplicateTuple", {
        first: existingIndex + 1,
        second: index + 1,
        tuple: tupleKey,
      }));
    } else {
      tupleIndexes.set(tupleKey, index);
    }

    const payloadRoot = payloadRootForTarget(target);
    if (!payloadRoot.startsWith("payloads/")) {
      targetIssues.push(t("builder.validation.payloadRootInvalid", { target: label }));
    }

    const guiEntrypoint = target.guiEntrypoint.trim();
    const cliEntrypoint = target.cliEntrypoint.trim();
    if (form.hasGui && guiEntrypoint.length === 0) {
      targetIssues.push(t("builder.validation.missingGuiEntrypoint", { target: label }));
      markIssue(fieldIssues, `target:${index}:guiEntrypoint`);
    }
    if (form.hasCli && cliEntrypoint.length === 0) {
      targetIssues.push(t("builder.validation.missingCliEntrypoint", { target: label }));
      markIssue(fieldIssues, `target:${index}:cliEntrypoint`);
    }

    for (const [entrypoint, key] of [[guiEntrypoint, "gui"], [cliEntrypoint, "cli"]] as const) {
      if (entrypoint.length === 0) {
        continue;
      }
      if (entrypoint.startsWith("/") || entrypoint.includes("..")) {
        targetIssues.push(t("builder.validation.entrypointUnsafe", { target: label, entrypoint: key }));
      }
    }
  }

  for (let left = 0; left < form.targets.length; left += 1) {
    for (let right = left + 1; right < form.targets.length; right += 1) {
      const a = form.targets[left];
      const b = form.targets[right];
      if (a.os !== "linux" || b.os !== "linux" || a.arch !== b.arch) {
        continue;
      }
      const aDesktop = linuxDesktopListForTarget(a);
      const bDesktop = linuxDesktopListForTarget(b);
      const overlap = aDesktop.filter((desktop) => bDesktop.includes(desktop));
      if (overlap.length > 0) {
        targetIssues.push(t("builder.validation.ambiguousTargets", {
          first: left + 1,
          second: right + 1,
          desktop: overlap.join(", "),
        }));
      }
    }
  }

  const assetsIssues: string[] = [];
  if (!form.iconPath.trim()) {
    assetsIssues.push(t("builder.validation.iconRequired"));
    markIssue(fieldIssues, "iconPath");
  }
  if (screenshots.length < builderMinScreenshots) {
    assetsIssues.push(t("builder.validation.screenshotMin"));
    markIssue(fieldIssues, "screenshots");
  }
  if (screenshots.length > builderMaxScreenshots) {
    assetsIssues.push(t("builder.validation.screenshotMax", { count: screenshots.length }));
    markIssue(fieldIssues, "screenshots");
  }
  if (form.requiresLicenseAcceptance && !form.licenseFile.trim()) {
    assetsIssues.push(t("builder.validation.licenseFileRequired"));
    markIssue(fieldIssues, "licenseFile");
  }

  const stepIssues: StepIssueMap = {
    identity: identityIssues,
    metadata: metadataIssues,
    interfaces: interfaceIssues,
    targets: Array.from(new Set(targetIssues)),
    assets: assetsIssues,
    review: [],
  };

  return { stepIssues, fieldIssues };
};

export const collectBuilderValidation = (args: CollectBuilderValidationArgs): StepIssueMap =>
  collectBuilderValidationResult(args).stepIssues;
