import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "preact/hooks";
import { appText } from "../i18n/app";
import { applyUpdateAndRestart, checkForUpdates as checkForUpdatesApi } from "../lib/tauri/api";
import type { UpdateCheckResult } from "../types/app";

type UseUpdateManagerOptions = {
  onErrorToast: (message: string) => void;
  onInfoToast: (message: string) => void;
};

export const useUpdateManager = ({ onErrorToast, onInfoToast }: UseUpdateManagerOptions) => {
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [applyingUpdate, setApplyingUpdate] = useState(false);

  const checkForUpdates = async (showNoUpdateMessage: boolean) => {
    if (checkingUpdates) {
      return;
    }

    setCheckingUpdates(true);
    try {
      const result = await checkForUpdatesApi();
      setUpdateResult(result);
      setLastCheckedAt(Date.now());

      if (showNoUpdateMessage) {
        setIsUpdateModalOpen(true);
      }
    } catch {
      onErrorToast(appText("toast.updateCheckFailed"));
    } finally {
      setCheckingUpdates(false);
    }
  };

  const closeUpdateModal = () => setIsUpdateModalOpen(false);
  const openUpdateModal = () => setIsUpdateModalOpen(true);

  const relativeLastChecked = () => {
    if (!lastCheckedAt) {
      return appText("update.notCheckedYet");
    }
    const elapsed = Date.now() - lastCheckedAt;
    if (elapsed < 60_000) {
      return appText("update.justNow");
    }
    const minutes = Math.floor(elapsed / 60_000);
    return appText("update.minutesAgo", { minutes });
  };

  const handleUpdateAndRestart = async () => {
    if (!updateResult) {
      return;
    }

    if (!updateResult.downloadUrl || !updateResult.sha256) {
      onErrorToast(appText("toast.updateMetadataIncomplete"));
      return;
    }

    setApplyingUpdate(true);
    onInfoToast(appText("toast.updateApplying", { version: updateResult.latestVersion }));

    try {
      await applyUpdateAndRestart(updateResult.downloadUrl, updateResult.sha256);
      await getCurrentWindow().close();
    } catch {
      onErrorToast(appText("toast.updateApplyFailed"));
      setApplyingUpdate(false);
    }
  };

  return {
    updateResult,
    checkingUpdates,
    isUpdateModalOpen,
    applyingUpdate,
    hasUpdateAvailable: updateResult?.updateAvailable === true,
    checkForUpdates,
    closeUpdateModal,
    openUpdateModal,
    relativeLastChecked,
    handleUpdateAndRestart,
  };
};
