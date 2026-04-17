import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "preact/hooks";
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
      onErrorToast("Unable to check for updates right now.");
    } finally {
      setCheckingUpdates(false);
    }
  };

  const closeUpdateModal = () => setIsUpdateModalOpen(false);
  const openUpdateModal = () => setIsUpdateModalOpen(true);

  const relativeLastChecked = () => {
    if (!lastCheckedAt) {
      return "Not checked yet";
    }
    const elapsed = Date.now() - lastCheckedAt;
    if (elapsed < 60_000) {
      return "Just now";
    }
    const minutes = Math.floor(elapsed / 60_000);
    return `${minutes}m ago`;
  };

  const handleUpdateAndRestart = async () => {
    if (!updateResult) {
      return;
    }

    if (!updateResult.downloadUrl || !updateResult.sha256) {
      onErrorToast("Update metadata is incomplete. Please try again later.");
      return;
    }

    setApplyingUpdate(true);
    onInfoToast(`Applying update ${updateResult.latestVersion}. Yambuck will restart.`);

    try {
      await applyUpdateAndRestart(updateResult.downloadUrl, updateResult.sha256);
      await getCurrentWindow().close();
    } catch {
      onErrorToast("Unable to apply update automatically. Please retry or use website installer.");
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
