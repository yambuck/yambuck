export type BuilderStep = "identity" | "metadata" | "interfaces" | "targets" | "assets";

export const builderMinScreenshots = 1;
export const builderMaxScreenshots = 6;

export type BuilderArch = "x86_64" | "aarch64" | "riscv64";

export type BuilderTarget = {
  arch: BuilderArch;
  variant: string;
  desktopEnvironment: "all" | "x11" | "wayland";
  guiEntrypoint: string;
  cliEntrypoint: string;
};

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

export const builderSteps: BuilderStep[] = ["interfaces", "metadata", "assets", "identity", "targets"];
