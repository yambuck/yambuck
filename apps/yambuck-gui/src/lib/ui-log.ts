import { logUiEvent } from "./tauri/api";

type UiLogValue = string | number | boolean | null | undefined;

const sanitizeValue = (value: UiLogValue): string => {
  if (value === null || value === undefined) {
    return "none";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 220);
};

const toMessage = (action: string, details?: Record<string, UiLogValue>) => {
  const parts = [`ui.action=${sanitizeValue(action)}`];

  if (details) {
    const keys = Object.keys(details).sort();
    for (const key of keys) {
      parts.push(`ui.${key}=${sanitizeValue(details[key])}`);
    }
  }

  return parts.join(" ");
};

export const logUiAction = (action: string, details?: Record<string, UiLogValue>) => {
  void logUiEvent("INFO", toMessage(action, details)).catch(() => {});
};

export const logUiError = (action: string, details?: Record<string, UiLogValue>) => {
  void logUiEvent("ERROR", toMessage(action, details)).catch(() => {});
};
