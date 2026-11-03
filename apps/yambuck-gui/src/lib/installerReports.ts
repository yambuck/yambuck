// Plain-text reports the installer copies for bug reports and publishers.
import type { InstallPreflightResult, InstallScope, PackageInfo } from "../types/app";

export type InstallFailureState = {
  summary: string;
  details: string;
  capturedAtIso8601: string;
  capturedAtDisplay: string;
};

export type InstallLifecycleState =
  | "queued"
  | "downloading"
  | "validating"
  | "installing"
  | "verifying"
  | "success"
  | "failed";

export const normalizeOpenPackageError = (error: unknown): string => {
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed || "Package validation failed.";
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed || "Package validation failed.";
  }

  return "Package validation failed.";
};

export const normalizeInstallFailureMessage = (error: unknown): string => {
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "Install failed. Check details and try again.";
};

export type PackageOpenError = {
  packageFile: string;
  message: string;
  capturedAtIso8601: string;
  capturedAtDisplay: string;
};

export const buildPackageOpenErrorReport = (error: PackageOpenError): string =>
  [
    "Yambuck package validation error",
    `Time: ${error.capturedAtIso8601}`,
    `Package: ${error.packageFile}`,
    `Error: ${error.message}`,
  ].join("\n");

export const buildInstallFailureReport = (
  failure: InstallFailureState,
  packageInfo: PackageInfo,
  scope: InstallScope,
): string =>
  [
    "Yambuck install failure",
    `Time: ${failure.capturedAtIso8601}`,
    `App: ${packageInfo.displayName}`,
    `App ID: ${packageInfo.appId}`,
    `Scope: ${scope}`,
    `Summary: ${failure.summary}`,
    "",
    "Technical details:",
    failure.details,
  ].join("\n");

export const buildInstallPreflightReport = (installPreflight: InstallPreflightResult, capturedAt: string): string => {
  const reasonLines = installPreflight.reasons.length === 0
    ? ["- none"]
    : installPreflight.reasons.flatMap((reason) => [
      `- [${reason.code}] ${reason.message}`,
      ...(reason.technicalDetails ? [`  technical: ${reason.technicalDetails}`] : []),
    ]);
  const runtimeDependencyLines = installPreflight.runtimeDependencyIssues.length === 0
    ? ["- none"]
    : installPreflight.runtimeDependencyIssues.flatMap((issue) => [
      `- [${issue.severity}] [${issue.reasonCode}] (${issue.checkType}:${issue.id}) ${issue.message}`,
      ...(issue.technicalHint ? [`  hint: ${issue.technicalHint}`] : []),
      ...(issue.technicalDetails ? [`  technical: ${issue.technicalDetails}`] : []),
    ]);

  return [
    "Yambuck install compatibility report",
    `Time: ${capturedAt}`,
    `Status: ${installPreflight.status}`,
    "",
    "Package:",
    `- Display name: ${installPreflight.package.displayName}`,
    `- Version: ${installPreflight.package.version}`,
    `- App ID: ${installPreflight.package.appId}`,
    `- Package UUID: ${installPreflight.package.packageUuid}`,
    `- Target: ${installPreflight.package.selectedTargetId ?? "none"}`,
    "",
    "Host:",
    `- OS: ${installPreflight.host.os}`,
    `- Arch: ${installPreflight.host.architecture}`,
    `- Distro: ${installPreflight.host.distribution}`,
    `- Kernel: ${installPreflight.host.kernelVersion}`,
    `- Desktop: ${installPreflight.host.desktop}`,
    `- Session: ${installPreflight.host.sessionType}`,
    "",
    "Reasons:",
    ...reasonLines,
    "",
    "Runtime dependency issues:",
    ...runtimeDependencyLines,
    "",
    `Summary: ${installPreflight.message}`,
    "Action: Please contact the app developer or publisher and share this report.",
  ].join("\n");
};
