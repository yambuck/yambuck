import installerEn from "./en/installer.json";
import type { InstallDecision } from "../types/app";

type MessageValue = string | number;
type MessageParams = Record<string, MessageValue | undefined>;

const installerDictionary = installerEn as Record<string, string>;

export const installerText = (key: string, params?: MessageParams): string => {
  const template = installerDictionary[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, paramName: string) => {
    const value = params[paramName];
    return value === undefined ? `{${paramName}}` : String(value);
  });
};

export const installerDecisionMessage = (decision: InstallDecision | null): string => {
  if (!decision) {
    return installerText("decision.message.newInstall");
  }
  switch (decision.action) {
    case "update":
      return installerText("decision.message.update", {
        existingVersion: decision.existingVersion ?? "current",
        incomingVersion: decision.incomingVersion,
      });
    case "reinstall":
      return installerText("decision.message.reinstall", {
        incomingVersion: decision.incomingVersion,
      });
    case "downgrade":
      return installerText("decision.message.downgrade", {
        existingVersion: decision.existingVersion ?? "current",
        incomingVersion: decision.incomingVersion,
      });
    case "blocked_identity_mismatch":
      return installerText("decision.message.blockedIdentityMismatch");
    default:
      return installerText("decision.message.newInstall");
  }
};
