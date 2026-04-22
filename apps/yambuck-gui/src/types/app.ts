export type WizardStep = "details" | "trust" | "license" | "scope" | "options" | "progress" | "complete" | "failed";
export type InstallScope = "user" | "system";
export type UninstallStep = "confirm" | "options" | "running" | "result";
export type AppPage = "installer" | "installed" | "installedReview" | "settings" | "mockPreview" | "mockInstalled" | "mockInstalledReview" | "mockInstallFlow";
export type SettingsTab = "general" | "debug";

export type InstallerContext = {
  productName: string;
  appVersion: string;
  platform: string;
  defaultScope: InstallScope;
  trustMode: string;
};

export type PackageInfo = {
  packageFile: string;
  fileName: string;
  displayName: string;
  appId: string;
  appUuid: string;
  version: string;
  manifestVersion: string;
  publisher: string;
  description: string;
  longDescription?: string;
  entrypoint: string;
  iconPath: string;
  iconDataUrl?: string;
  screenshots: string[];
  screenshotDataUrls: string[];
  homepageUrl?: string;
  supportUrl?: string;
  license?: string;
  licenseFile?: string;
  licenseText?: string;
  requiresLicenseAcceptance: boolean;
  configPath?: string;
  cachePath?: string;
  tempPath?: string;
  packageUuid: string;
  trustStatus: string;
};

export type InstallWorkflow = {
  manifestMajor: number;
  packageInfo: PackageInfo;
  wizardSteps: WizardStep[];
  installOptions: InstallOptionDefinition[];
};

export type InstallWorkflowSession = {
  workflowId: string;
  workflow: InstallWorkflow;
};

export type InstallAction =
  | "new_install"
  | "update"
  | "reinstall"
  | "downgrade"
  | "blocked_identity_mismatch";

export type InstallDecision = {
  action: InstallAction;
  message: string;
  existingVersion?: string;
  existingScope?: InstallScope;
  otherScopeExistingVersion?: string;
  otherScope?: InstallScope;
  incomingVersion: string;
};

export type InstallOptionDefinition = {
  id: string;
  label: string;
  description?: string;
  inputType: "select" | "checkbox" | "text";
  required: boolean;
  defaultValue?: string;
  choices: InstallOptionChoice[];
};

export type InstallOptionChoice = {
  value: string;
  label: string;
  description?: string;
};

export type InstallOptionValue =
  | { type: "select"; value: string }
  | { type: "checkbox"; value: boolean }
  | { type: "text"; value: string };

export type InstallOptionSubmission = {
  id: string;
  value: InstallOptionValue;
};

export type InstallPreview = {
  packageFile: string;
  installScope: InstallScope;
  destinationPath: string;
  trustStatus: string;
};

export type InstalledApp = {
  appId: string;
  displayName: string;
  version: string;
  installStatus: "installed" | "missing_payload";
  installScope: InstallScope;
  installedAt: string;
  destinationPath: string;
  iconDataUrl?: string;
};

export type InstalledAppDetails = {
  appId: string;
  displayName: string;
  version: string;
  installScope: InstallScope;
  installedAt: string;
  destinationPath: string;
  packageInfo: PackageInfo;
};

export type UninstallResult = {
  appId: string;
  installScope: InstallScope;
  removedAppFiles: boolean;
  removedUserData: boolean;
  warnings: string[];
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  channel: string;
  notesUrl?: string;
  downloadUrl?: string;
  sha256?: string;
};

export type SystemInfo = {
  appVersion: string;
  os: string;
  arch: string;
  kernelVersion: string;
  distro: string;
  desktopEnvironment: string;
  sessionType: string;
  installPath: string;
  updateFeedUrl: string;
};

export type PreflightCheckResult = {
  status: "ok" | "managed_existing" | "external_conflict";
  message: string;
};

export type ExternalPackageOpenPayload = {
  packageFile: string;
};
