import { useState } from "preact/hooks";
import { logUiAction } from "../lib/ui-log";

/** The installer's viewer modals: the screenshot gallery and the license text. */
export const useInstallerViewers = () => {
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState<number | null>(null);
  const [screenshotGallery, setScreenshotGallery] = useState<string[]>([]);
  const [licenseViewer, setLicenseViewer] = useState<{ title: string; text: string } | null>(null);

  const openScreenshotModal = (gallery: string[], index: number) => {
    setScreenshotGallery(gallery);
    setActiveScreenshotIndex(index);
  };

  const closeScreenshotModal = () => {
    setActiveScreenshotIndex(null);
    setScreenshotGallery([]);
  };

  const cycleScreenshot = (direction: -1 | 1) => {
    if (screenshotGallery.length === 0 || activeScreenshotIndex === null) {
      return;
    }
    const count = screenshotGallery.length;
    setActiveScreenshotIndex((activeScreenshotIndex + direction + count) % count);
  };

  const openLicenseViewer = (title: string, text: string) => {
    logUiAction("installer-open-license-viewer", { title });
    setLicenseViewer({ title, text });
  };

  const closeLicenseViewer = () => {
    logUiAction("installer-close-license-viewer");
    setLicenseViewer(null);
  };

  return {
    activeScreenshotIndex,
    screenshotGallery,
    openScreenshotModal,
    closeScreenshotModal,
    cycleScreenshot,
    licenseViewer,
    openLicenseViewer,
    closeLicenseViewer,
    resetLicenseViewer: () => setLicenseViewer(null),
  };
};
