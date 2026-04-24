import { useState } from "preact/hooks";
import { clearLogs as clearLogsApi, getRecentLogs, getSystemInfo } from "../lib/tauri/api";
import { logUiAction, logUiError } from "../lib/ui-log";
import { copyPlainText } from "../utils/clipboard";
import type { SystemInfo } from "../types/app";

type UseDebugToolsOptions = {
  onToast: (tone: "info" | "success" | "warning" | "error", message: string, durationMs?: number) => void;
};

export const useDebugTools = ({ onToast }: UseDebugToolsOptions) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [logText, setLogText] = useState("");
  const [loadingDebug, setLoadingDebug] = useState(false);

  const loadDebugData = async () => {
    setLoadingDebug(true);
    logUiAction("debug-load-start");
    try {
      const [info, logs] = await Promise.all([getSystemInfo(), getRecentLogs(300)]);
      setSystemInfo(info);
      setLogText(logs);
      logUiAction("debug-load-success");
    } catch {
      logUiError("debug-load-failed");
      onToast("error", "Unable to load debug data.");
    } finally {
      setLoadingDebug(false);
    }
  };

  const copyText = async (value: string, successMessage: string) => {
    if (!value.trim()) {
      onToast("warning", "Nothing to copy yet.");
      return;
    }

    try {
      await copyPlainText(value);
      onToast("success", successMessage);
      logUiAction("debug-copy", { message: successMessage });
    } catch {
      logUiError("debug-copy-failed", { message: successMessage });
      onToast("error", "Copy failed.");
    }
  };

  const copySystemInfo = async () => {
    if (!systemInfo) {
      onToast("warning", "System info not loaded yet.");
      return;
    }

    const lines = [
      `Yambuck v${systemInfo.appVersion}`,
      `OS: ${systemInfo.os}`,
      `Arch: ${systemInfo.arch}`,
      `Kernel: ${systemInfo.kernelVersion}`,
      `Distro: ${systemInfo.distro}`,
      `Desktop: ${systemInfo.desktopEnvironment}`,
      `Session: ${systemInfo.sessionType}`,
      `Install path: ${systemInfo.installPath}`,
      `Update feed: ${systemInfo.updateFeedUrl}`,
    ];

    await copyText(lines.join("\n"), "System info copied.");
  };

  const copyLogs = async () => {
    await copyText(logText, "Logs copied.");
  };

  const clearLogs = async () => {
    try {
      await clearLogsApi();
      setLogText("");
      logUiAction("debug-clear-logs");
      onToast("info", "Logs cleared.");
    } catch {
      logUiError("debug-clear-logs-failed");
      onToast("error", "Unable to clear logs.");
    }
  };

  return {
    systemInfo,
    logText,
    loadingDebug,
    loadDebugData,
    copySystemInfo,
    copyLogs,
    clearLogs,
  };
};
