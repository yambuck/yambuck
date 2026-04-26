import type { AppPage, InstallScope, SettingsTab } from "../types/app";

export type RouteState = {
  page: AppPage;
  settingsTab: SettingsTab;
  installedReviewTarget: string | null;
  mockInstalledReviewAppId: string | null;
};

export const makeInstalledReviewTarget = (appId: string, installScope: InstallScope): string => `${appId}::${installScope}`;

export const parseInstalledReviewTarget = (
  value: string | null,
): { appId: string; installScope: InstallScope } | null => {
  if (!value) {
    return null;
  }

  const delimiter = value.lastIndexOf("::");
  if (delimiter <= 0 || delimiter === value.length - 2) {
    return null;
  }

  const appId = value.slice(0, delimiter);
  const scopeCandidate = value.slice(delimiter + 2);
  if (scopeCandidate !== "user" && scopeCandidate !== "system") {
    return null;
  }

  return { appId, installScope: scopeCandidate };
};

export const routeFromHash = (hash: string): RouteState => {
  const segments = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] === "installer") {
    return { page: "installer", settingsTab: "general", installedReviewTarget: null, mockInstalledReviewAppId: null };
  }

  if (segments[0] === "installed") {
    if (segments[1] === "uninstall") {
      return { page: "installedUninstall", settingsTab: "general", installedReviewTarget: null, mockInstalledReviewAppId: null };
    }
    if (segments[1] === "review" && segments[2]) {
      return {
        page: "installedReview",
        settingsTab: "general",
        installedReviewTarget: decodeURIComponent(segments.slice(2).join("/")),
        mockInstalledReviewAppId: null,
      };
    }
    return { page: "installed", settingsTab: "general", installedReviewTarget: null, mockInstalledReviewAppId: null };
  }

  if (segments[0] === "build-package") {
    return { page: "packageBuilder", settingsTab: "general", installedReviewTarget: null, mockInstalledReviewAppId: null };
  }

  if (segments[0] === "settings") {
    if (segments[1] === "debug" && segments[2] === "ui-lab") {
      return {
        page: "uiDebugLab",
        settingsTab: "debug",
        installedReviewTarget: null,
        mockInstalledReviewAppId: null,
      };
    }
    return {
      page: "settings",
      settingsTab: segments[1] === "debug" ? "debug" : "general",
      installedReviewTarget: null,
      mockInstalledReviewAppId: null,
    };
  }

  if (segments[0] === "debug") {
    if (segments[1] === "installed") {
      if (segments[2] === "uninstall") {
        return {
          page: "mockInstalledUninstall",
          settingsTab: "general",
          installedReviewTarget: null,
          mockInstalledReviewAppId: decodeURIComponent(segments.slice(3).join("/")) || null,
        };
      }
      if (segments[2] === "review" && segments[3]) {
        return {
          page: "mockInstalledReview",
          settingsTab: "general",
          installedReviewTarget: null,
          mockInstalledReviewAppId: decodeURIComponent(segments.slice(3).join("/")),
        };
      }
      return { page: "mockInstalled", settingsTab: "general", installedReviewTarget: null, mockInstalledReviewAppId: null };
    }
    if (segments[1] === "install-flow") {
      return { page: "mockInstallFlow", settingsTab: "general", installedReviewTarget: null, mockInstalledReviewAppId: null };
    }
    return { page: "mockPreview", settingsTab: "general", installedReviewTarget: null, mockInstalledReviewAppId: null };
  }

  return { page: "installer", settingsTab: "general", installedReviewTarget: null, mockInstalledReviewAppId: null };
};

export const hashFromRoute = ({ page, settingsTab, installedReviewTarget, mockInstalledReviewAppId }: RouteState): string => {
  if (page === "installer") {
    return "#/installer";
  }
  if (page === "installed") {
    return "#/installed";
  }
  if (page === "installedReview") {
    return installedReviewTarget ? `#/installed/review/${encodeURIComponent(installedReviewTarget)}` : "#/installed";
  }
  if (page === "installedUninstall") {
    return "#/installed/uninstall";
  }
  if (page === "packageBuilder") {
    return "#/build-package";
  }
  if (page === "settings") {
    return settingsTab === "debug" ? "#/settings/debug" : "#/settings";
  }
  if (page === "uiDebugLab") {
    return "#/settings/debug/ui-lab";
  }
  if (page === "mockInstalled") {
    return "#/debug/installed";
  }
  if (page === "mockInstalledReview") {
    return mockInstalledReviewAppId
      ? `#/debug/installed/review/${encodeURIComponent(mockInstalledReviewAppId)}`
      : "#/debug/installed";
  }
  if (page === "mockInstalledUninstall") {
    return mockInstalledReviewAppId
      ? `#/debug/installed/uninstall/${encodeURIComponent(mockInstalledReviewAppId)}`
      : "#/debug/installed/uninstall";
  }
  if (page === "mockInstallFlow") {
    return "#/debug/install-flow";
  }
  return "#/debug/preview";
};
