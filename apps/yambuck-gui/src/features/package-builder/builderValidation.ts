import type { BuilderFormState, BuilderStep, BuilderTarget } from "./builderTypes";

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
  return `payloads/linux/${target.arch}/${variant}`;
};

export const linuxDesktopListForTarget = (target: BuilderTarget): string[] => {
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
    const desktopScope = target.desktopEnvironment === "all" ? "" : `-${target.desktopEnvironment}`;
    const base = `linux-${target.arch}-${variant}${desktopScope}`;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  });
};

const isValidHttpUrl = (value: string): boolean => {
  if (!value.trim()) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

type CollectBuilderValidationArgs = {
  form: BuilderFormState;
  screenshots: string[];
  t: Translate;
};

export type StepIssueMap = Record<BuilderStep, string[]>;

export const collectBuilderValidation = ({ form, screenshots, t }: CollectBuilderValidationArgs): StepIssueMap => {
  const identityIssues: string[] = [];
  if (!form.appId.trim()) {
    identityIssues.push(t("builder.validation.missingAppId"));
  }
  if (!form.appUuid.trim()) {
    identityIssues.push(t("builder.validation.missingAppUuid"));
  }
  if (!form.packageUuid.trim()) {
    identityIssues.push(t("builder.validation.missingPackageUuid"));
  }

  const metadataIssues: string[] = [];
  if (!form.displayName.trim()) {
    metadataIssues.push(t("builder.validation.missingDisplayName"));
  }
  if (!form.description.trim()) {
    metadataIssues.push(t("builder.validation.missingDescription"));
  }
  if (!form.longDescription.trim()) {
    metadataIssues.push(t("builder.validation.missingLongDescription"));
  }
  if (!form.version.trim()) {
    metadataIssues.push(t("builder.validation.missingVersion"));
  }
  if (!form.publisher.trim()) {
    metadataIssues.push(t("builder.validation.missingPublisher"));
  }
  if (!isValidHttpUrl(form.homepageUrl)) {
    metadataIssues.push(t("builder.validation.invalidHomepageUrl"));
  }
  if (!isValidHttpUrl(form.supportUrl)) {
    metadataIssues.push(t("builder.validation.invalidSupportUrl"));
  }

  const interfaceIssues: string[] = [];
  if (!form.hasGui && !form.hasCli) {
    interfaceIssues.push(t("builder.validation.interfaceRequired"));
  }
  if (form.hasCli && !form.commandName.trim()) {
    interfaceIssues.push(t("builder.validation.cliCommandRequired"));
  }

  const targetIssues: string[] = [];
  const tupleIndexes = new Map<string, number>();
  for (let index = 0; index < form.targets.length; index += 1) {
    const target = form.targets[index];
    const label = t("builder.targets.item", { index: index + 1 });
    const variant = sanitizeTargetSegment(target.variant, "default");

    if (target.variant.trim().length === 0) {
      targetIssues.push(t("builder.validation.targetVariantRequired", { target: label }));
    }

    const tupleKey = `linux/${target.arch}/${variant}`;
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
    }
    if (form.hasCli && cliEntrypoint.length === 0) {
      targetIssues.push(t("builder.validation.missingCliEntrypoint", { target: label }));
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
      if (a.arch !== b.arch) {
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
  }
  if (screenshots.length < 1) {
    assetsIssues.push(t("builder.validation.screenshotMin"));
  }
  if (screenshots.length > 6) {
    assetsIssues.push(t("builder.validation.screenshotMax", { count: screenshots.length }));
  }
  if (form.requiresLicenseAcceptance && !form.licenseFile.trim()) {
    assetsIssues.push(t("builder.validation.licenseFileRequired"));
  }

  return {
    identity: identityIssues,
    metadata: metadataIssues,
    interfaces: interfaceIssues,
    targets: Array.from(new Set(targetIssues)),
    assets: assetsIssues,
  };
};
