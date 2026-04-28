export type BuilderStep = "identity" | "metadata" | "interfaces" | "targets" | "assets" | "review";

export const builderMinScreenshots = 1;
export const builderMaxScreenshots = 6;

export type BuilderOs = "linux" | "windows" | "macos";
export type BuilderArch = "x86_64" | "aarch64" | "riscv64";

export type BuilderTarget = {
  editorId: string;
  os: BuilderOs;
  arch: BuilderArch;
  variant: string;
  desktopEnvironment: "all" | "x11" | "wayland" | "none";
  guiEntrypoint: string;
  cliEntrypoint: string;
};

export const createBuilderTargetEditorId = (seed = "target"): string =>
  `${seed}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

export type BuilderFormState = {
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

export const builderSteps: BuilderStep[] = ["metadata", "interfaces", "assets", "identity", "targets", "review"];
