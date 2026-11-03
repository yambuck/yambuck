import { useState } from "preact/hooks";
import { appText } from "../i18n/app";
import { checkForUpdates as checkForUpdatesApi, installUpdate, logUiEvent } from "../lib/tauri/api";
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
    } catch (error) {
      // The silent startup check only logs its failures; a manual check tells
      // the user.
      void logUiEvent("WARN", `Update check failed: ${String(error)}`).catch(() => undefined);
      if (showNoUpdateMessage) {
        onErrorToast(appText("toast.updateCheckFailed"));
      }
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

    setApplyingUpdate(true);
    onInfoToast(appText("toast.updateApplying"));

    // The backend starts the installer in a detached process and exits the
    // app shortly after; the installer relaunches the new version (or this
    // one with --update-failed if it fails).
    try {
      await installUpdate();
    } catch (error) {
      onErrorToast(appText("toast.updateApplyFailed", { error: String(error) }));
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
