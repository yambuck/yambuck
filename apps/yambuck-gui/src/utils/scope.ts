import type { InstallScope } from "../types/app";

export const formatInstallScopeLabel = (scope: InstallScope): string =>
  scope === "system" ? "System wide" : "My user";
