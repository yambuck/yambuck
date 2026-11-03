import { useState } from "preact/hooks";
import { appText } from "../i18n/app";
import {
  copySessionLog,
  getLogLevel,
  getSessionLogText,
  getSystemInfo,
  openLogFolder,
  openSessionLog,
  setLogLevel as setLogLevelApi,
} from "../lib/tauri/api";
import { logUiAction, logUiError } from "../lib/ui-log";
import { copyPlainText } from "../utils/clipboard";
import type { LogLevel, SystemInfo } from "../types/app";

type UseDebugToolsOptions = {
  onToast: (tone: "info" | "success" | "warning" | "error", message: string) => void;
};

const LOG_PREVIEW_LINES = 300;

/** Settings -> Debug's Logs block (App Standard section 4). */
export const useDebugTools = ({ onToast }: UseDebugToolsOptions) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [logText, setLogText] = useState("");
  const [logLevel, setLogLevel] = useState<LogLevel>("info");
  const [loadingDebug, setLoadingDebug] = useState(false);

  const loadDebugData = async () => {
    setLoadingDebug(true);
    logUiAction("debug-load-start");
    try {
      const [info, logs, level] = await Promise.all([getSystemInfo(), getSessionLogText(), getLogLevel()]);
      setSystemInfo(info);
      setLogText(logs.split("\n").slice(-LOG_PREVIEW_LINES).join("\n"));
      setLogLevel(level);
      logUiAction("debug-load-success");
    } catch (error) {
      logUiError("debug-load-failed", { error: String(error) });
      onToast("error", appText("toast.debugLoadFailed"));
    } finally {
      setLoadingDebug(false);
    }
  };

  const runAction = async (action: string, run: () => Promise<unknown>, successMessage?: string) => {
    try {
      await run();
      logUiAction(action);
      if (successMessage) {
        onToast("success", successMessage);
      }
    } catch (error) {
      logUiError(`${action}-failed`, { error: String(error) });
      onToast("error", appText("toast.debugActionFailed", { error: String(error) }));
    }
  };

  const copyLog = () => runAction("debug-copy-log", copySessionLog, appText("toast.logsCopied"));

  const openLog = () => runAction("debug-open-log", openSessionLog);

  const openLogFolderAction = () => runAction("debug-open-log-folder", openLogFolder);

  const copySystemInfo = async () => {
    if (!systemInfo) {
      onToast("warning", appText("toast.systemInfoNotLoaded"));
      return;
    }
    const lines = [
      `${systemInfo.appName} v${systemInfo.appVersion} (${systemInfo.buildProfile})`,
      `OS: ${systemInfo.distribution} (${systemInfo.os}, kernel ${systemInfo.kernelVersion})`,
      `Architecture: ${systemInfo.architecture}`,
      `Desktop: ${systemInfo.desktop} (${systemInfo.sessionType})`,
      `Executable: ${systemInfo.executable}`,
    ];
    await runAction("debug-copy-system-info", () => copyPlainText(lines.join("\n")), appText("toast.systemInfoCopied"));
  };

  const changeLogLevel = (level: LogLevel) =>
    runAction("debug-set-log-level", async () => {
      setLogLevel(await setLogLevelApi(level));
    });

  return {
    systemInfo,
    logText,
    logLevel,
    loadingDebug,
    loadDebugData,
    copyLog,
    openLog,
    openLogFolder: openLogFolderAction,
    copySystemInfo,
    changeLogLevel,
  };
};

export type DebugTools = ReturnType<typeof useDebugTools>;
