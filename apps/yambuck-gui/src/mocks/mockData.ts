import type {
  InstallOptionDefinition,
  InstalledApp,
  InstalledAppDetails,
  InstallScope,
  PackageInfo,
} from "../types/app";

const svgDataUrl = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const mockIcon = (primary: string, accent: string) =>
  svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="${primary}"/><circle cx="64" cy="50" r="24" fill="#d5f3ff"/><rect x="26" y="82" width="76" height="18" rx="9" fill="${accent}"/></svg>`,
  );

const mockShot = (bgA: string, bgB: string, highlight: string) =>
  svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1600" viewBox="0 0 960 1600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></linearGradient></defs><rect width="960" height="1600" fill="url(#g)"/><rect x="62" y="116" width="836" height="212" rx="20" fill="#123d60"/><rect x="62" y="364" width="836" height="1176" rx="20" fill="#102f4a"/><rect x="102" y="436" width="756" height="60" rx="10" fill="${highlight}"/><rect x="102" y="520" width="600" height="40" rx="10" fill="#8fcaf0"/></svg>`,
  );

const mockScreenshots = [
  mockShot("#123d60", "#0a1f33", "#64dcff"),
  mockShot("#17466e", "#0b2339", "#5be7bf"),
  mockShot("#1b527d", "#0d2a43", "#88ccff"),
  mockShot("#144466", "#081a2a", "#6be9c8"),
  mockShot("#204f79", "#102a44", "#74d8ff"),
];

export const mockPackageInfo: PackageInfo = {
  packageFile: "/tmp/example-app-mock.yambuck",
  fileName: "example-app-mock.yambuck",
  displayName: "Example App (Mock Package)",
  appId: "com.example.app",
  appUuid: "6b61815c-66c5-4cc6-85ba-ec0736ecef4c",
  version: "1.4.2",
  manifestVersion: "1.0.0",
  publisher: "Example Project",
  description: "Mock package to iterate on installer and review UI without backend operations.",
  longDescription:
    "This mock package exists to exercise the installer layout, metadata density, and responsive behavior while preserving the exact production rendering path. Use it to verify screenshots, actions, and technical details at multiple window sizes.",
  entrypoint: "app/bin/example-app",
  iconPath: "assets/icon.svg",
  iconDataUrl: mockIcon("#103450", "#5be7bf"),
  screenshots: [
    "assets/screens/shot-1.png",
    "assets/screens/shot-2.png",
    "assets/screens/shot-3.png",
    "assets/screens/shot-4.png",
    "assets/screens/shot-5.png",
  ],
  screenshotDataUrls: mockScreenshots,
  homepageUrl: "https://example.com",
  supportUrl: "https://example.com/support",
  license: "MIT",
  licenseFile: "LICENSE",
  licenseText:
    "MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files to deal in the Software without restriction.",
  requiresLicenseAcceptance: true,
  configPath: "~/.config/example-app",
  cachePath: "~/.cache/example-app",
  tempPath: "~/.local/state/example-app/tmp",
  packageUuid: "7f2f2d3e-2662-4d8c-a4ae-05f14de8f8c6",
  trustStatus: "verified",
  appInterface: {
    hasGui: true,
    hasCli: true,
  },
  cliCommandName: "example-app",
  cliUsageHint: "Open Terminal and run: example-app --help",
  selectedTargetId: "linux-x86_64-default",
  payloadRoot: "payloads/linux/x86_64/default",
  compatibilityStatus: "supported",
  compatibilityReasons: [],
};

export const mockInstalledApps: InstalledApp[] = [
  {
    appId: "com.example.app",
    displayName: "Example App",
    version: "1.4.2",
    installStatus: "installed",
    installScope: "user",
    installedAt: "2026-04-20T10:12:16.220+01:00",
    destinationPath: "/home/jack/.local/share/yambuck/apps/com.example.app",
    iconDataUrl: mockPackageInfo.iconDataUrl,
  },
  {
    appId: "com.starchart.desktop",
    displayName: "Starchart Observatory Companion Suite",
    version: "3.18.0",
    installStatus: "installed",
    installScope: "system",
    installedAt: "2026-04-18T18:05:09.140+01:00",
    destinationPath: "/opt/yambuck/apps/com.starchart.desktop",
    iconDataUrl: mockIcon("#143c60", "#63d8ff"),
  },
  {
    appId: "io.longname.experimental",
    displayName: "Ultra Long Application Name To Stress Wrapping Behavior In Installed App Rows",
    version: "2026.4.0-beta.3",
    installStatus: "installed",
    installScope: "user",
    installedAt: "2026-04-17T09:42:31.999+01:00",
    destinationPath: "/home/jack/.local/share/yambuck/apps/io.longname.experimental",
    iconDataUrl: mockIcon("#1a4b74", "#7be8c4"),
  },
  {
    appId: "com.northern.radio",
    displayName: "Northern Radio",
    version: "0.9.7",
    installStatus: "installed",
    installScope: "system",
    installedAt: "2026-04-11T07:18:05.023+01:00",
    destinationPath: "/opt/yambuck/apps/com.northern.radio",
    iconDataUrl: mockIcon("#0f3858", "#79ccff"),
  },
];

export const toMockInstalledAppDetails = (app: InstalledApp): InstalledAppDetails => {
  const packageInfo: PackageInfo = {
    ...mockPackageInfo,
    appId: app.appId,
    displayName: app.displayName,
    version: app.version,
    iconDataUrl: app.iconDataUrl,
  };

  return {
    appId: app.appId,
    displayName: app.displayName,
    version: app.version,
    installScope: app.installScope,
    installedAt: app.installedAt,
    destinationPath: app.destinationPath,
    packageInfo,
  };
};

export const mockInstallOptions: InstallOptionDefinition[] = [
  {
    id: "channel",
    label: "Release channel",
    description: "Choose which release track to install.",
    inputType: "select",
    required: true,
    defaultValue: "stable",
    choices: [
      { value: "stable", label: "Stable" },
      { value: "preview", label: "Preview" },
      { value: "nightly", label: "Nightly" },
    ],
  },
  {
    id: "desktopLauncher",
    label: "Desktop launcher",
    description: "Create an app launcher entry in your desktop menu.",
    inputType: "checkbox",
    required: false,
    choices: [],
  },
  {
    id: "installDirName",
    label: "Install directory suffix",
    description: "Optional custom folder suffix under the destination root.",
    inputType: "text",
    required: false,
    choices: [],
  },
];

export const mockPreviewForScope = (scope: InstallScope) => ({
  packageFile: mockPackageInfo.fileName,
  installScope: scope,
  destinationPath:
    scope === "system"
      ? `/opt/yambuck/apps/${mockPackageInfo.appId}`
      : `/home/jack/.local/share/yambuck/apps/${mockPackageInfo.appId}`,
  trustStatus: mockPackageInfo.trustStatus,
});
