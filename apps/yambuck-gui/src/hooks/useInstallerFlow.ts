import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "preact/hooks";
import {
  completeInstall as completeInstallApi,
  createInstallPreview as createInstallPreviewApi,
  getStartupPackageArg,
  inspectPackage,
  preflightInstallCheck,
} from "../lib/tauri/api";
import type {
  AppPage,
  ExternalPackageOpenPayload,
  InstallPreview,
  InstallScope,
  InstalledApp,
  PackageInfo,
  WizardStep,
} from "../types/app";

const EXTERNAL_PACKAGE_OPEN_EVENT = "yambuck://open-package";

type UseInstallerFlowOptions = {
  setPage: (page: AppPage) => void;
  onRefreshInstalledApps: () => Promise<void>;
  onLaunchInstalledApp: (app: InstalledApp) => Promise<void>;
  onToast: (tone: "info" | "success" | "warning" | "error", message: string, durationMs?: number) => void;
};

export const useInstallerFlow = ({
  setPage,
  onRefreshInstalledApps,
  onLaunchInstalledApp,
  onToast,
}: UseInstallerFlowOptions) => {
  const [step, setStep] = useState<WizardStep>("details");
  const [scope, setScope] = useState<InstallScope>("user");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Ready to install package");
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [preview, setPreview] = useState<InstallPreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [preflightBlockedMessage, setPreflightBlockedMessage] = useState("");
  const [checkingPreflight, setCheckingPreflight] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState<number | null>(null);
  const [screenshotGallery, setScreenshotGallery] = useState<string[]>([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showCompleteTechnicalDetails, setShowCompleteTechnicalDetails] = useState(false);
  const [licenseAccepted, setLicenseAccepted] = useState(false);
  const [licenseViewer, setLicenseViewer] = useState<{ title: string; text: string } | null>(null);

  const clearSelectedPackage = useCallback(() => {
    setPackageInfo(null);
    setPreview(null);
    setStep("details");
    setPreflightBlockedMessage("");
    setActiveScreenshotIndex(null);
    setScreenshotGallery([]);
    setShowTechnicalDetails(false);
    setShowCompleteTechnicalDetails(false);
    setLicenseAccepted(false);
    setLicenseViewer(null);
  }, []);

  const closeInstallComplete = useCallback(() => {
    clearSelectedPackage();
    setPage("installed");
  }, [clearSelectedPackage, setPage]);

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
    const next = (activeScreenshotIndex + direction + count) % count;
    setActiveScreenshotIndex(next);
  };

  const isInstallFlowLocked = () => {
    if (!packageInfo) {
      return false;
    }

    return step === "trust" || step === "license" || step === "scope" || step === "progress";
  };

  const loadPackageFromPath = async (packageFile: string) => {
    try {
      const inspected = await inspectPackage(packageFile);
      setPackageInfo(inspected);
      setShowTechnicalDetails(false);
      setShowCompleteTechnicalDetails(false);
      setLicenseAccepted(false);
      setLicenseViewer(null);
      setStep("details");
      setPreview(null);
      setPreflightBlockedMessage("");
      setPage("installer");
    } catch {
      onToast("error", "Unable to open package. Choose a valid .yambuck file.");
    }
  };

  const choosePackage = async () => {
    let selected: string | null = null;

    try {
      const value = await open({
        multiple: false,
        filters: [{ name: "Yambuck package", extensions: ["yambuck"] }],
      });
      if (Array.isArray(value)) {
        selected = value[0] ?? null;
      } else {
        selected = value;
      }
    } catch {
      onToast("error", "Unable to open file picker. Check app permissions and try again.");
      return;
    }

    if (!selected) {
      return;
    }

    await loadPackageFromPath(selected);
  };

  useEffect(() => {
    const openStartupPackage = async () => {
      try {
        const startupPath = await getStartupPackageArg();
        if (!startupPath) {
          return;
        }
        await loadPackageFromPath(startupPath);
      } catch {
        onToast("error", "Could not open startup package argument.");
      }
    };

    void openStartupPackage();
  }, []);

  useEffect(() => {
    let detachListener: (() => void) | undefined;

    void listen<ExternalPackageOpenPayload>(EXTERNAL_PACKAGE_OPEN_EVENT, (event) => {
      const packageFile = event.payload?.packageFile;
      if (!packageFile) {
        return;
      }

      if (isInstallFlowLocked()) {
        onToast("warning", "Finish or cancel the current install before opening another package.");
        return;
      }

      void loadPackageFromPath(packageFile);
    }).then((unlisten) => {
      detachListener = unlisten;
    });

    return () => {
      if (detachListener) {
        detachListener();
      }
    };
  }, [step, packageInfo]);

  const handleContinueFromDetails = async () => {
    if (!packageInfo) {
      onToast("warning", "Choose a .yambuck package first.");
      return;
    }

    setCheckingPreflight(true);
    try {
      const result = await preflightInstallCheck(packageInfo.appId);

      if (result.status === "external_conflict") {
        setPreflightBlockedMessage(result.message);
        onToast("error", result.message, 5200);
        return;
      }

      setPreflightBlockedMessage("");

      if (result.status === "managed_existing") {
        onToast("info", "Existing Yambuck-managed install detected. Proceeding with replace.");
      }

      setStep("trust");
    } catch {
      onToast("error", "Could not run install safety checks.");
    } finally {
      setCheckingPreflight(false);
    }
  };

  const continueFromTrustStep = () => {
    if (!packageInfo) {
      return;
    }
    if (packageInfo.requiresLicenseAcceptance) {
      setStep("license");
      return;
    }
    setStep("scope");
  };

  const openLicenseViewer = (title: string, text: string) => {
    setLicenseViewer({ title, text });
  };

  const closeLicenseViewer = () => {
    setLicenseViewer(null);
  };

  const completeInstall = async (
    selectedPackage: PackageInfo,
    installPreview: InstallPreview,
    installScope: InstallScope,
  ) => {
    try {
      await completeInstallApi(selectedPackage, installScope, installPreview.destinationPath);
      onToast("success", `${selectedPackage.displayName} installed.`);
      await onRefreshInstalledApps();
    } catch {
      onToast("error", "Install finished with issues. Could not update installed apps index.");
    }
  };

  const startInstall = async () => {
    if (!packageInfo) {
      onToast("warning", "Choose a .yambuck package before installing.");
      return;
    }

    const selectedPackage = packageInfo;

    if (selectedPackage.requiresLicenseAcceptance && !licenseAccepted) {
      onToast("warning", "You must accept the license before installing.");
      setStep("license");
      return;
    }

    setPreflightBlockedMessage("");

    try {
      const preflight = await preflightInstallCheck(selectedPackage.appId);
      if (preflight.status === "external_conflict") {
        setPreflightBlockedMessage(preflight.message);
        onToast("error", preflight.message, 5200);
        return;
      }
    } catch {
      onToast("error", "Could not verify install ownership safety.");
      return;
    }

    setIsBusy(true);
    setStep("progress");
    setProgress(0);
    setStatusText("Preparing install preview");

    const verifiedPublisher = packageInfo.trustStatus === "verified";
    let installPreview: InstallPreview;

    try {
      installPreview = await createInstallPreviewApi(
        selectedPackage.packageFile,
        selectedPackage.appId,
        scope,
        verifiedPublisher,
      );
      setPreview(installPreview);
    } catch {
      onToast("error", "Failed to generate install preview.");
      setIsBusy(false);
      setStep("scope");
      return;
    }

    let nextProgress = 0;
    const timer = window.setInterval(() => {
      nextProgress += 10;
      setProgress(nextProgress);
      if (nextProgress <= 40) {
        setStatusText("Validating package integrity");
      } else if (nextProgress <= 80) {
        setStatusText("Installing application files");
      } else {
        setStatusText("Finalizing desktop integration");
      }
      if (nextProgress >= 100) {
        window.clearInterval(timer);
        setStatusText("Install complete");
        setIsBusy(false);
        setStep("complete");
        void completeInstall(selectedPackage, installPreview, scope);
      }
    }, 220);
  };

  const launchCurrentPackage = async () => {
    if (!packageInfo) {
      onToast("warning", "No package selected to launch.");
      return;
    }

    await onLaunchInstalledApp({
      appId: packageInfo.appId,
      displayName: packageInfo.displayName,
      version: packageInfo.version,
      installScope: scope,
      installedAt: "",
    });
  };

  return {
    step,
    setStep,
    scope,
    setScope,
    progress,
    statusText,
    packageInfo,
    preview,
    isBusy,
    preflightBlockedMessage,
    checkingPreflight,
    showTechnicalDetails,
    setShowTechnicalDetails,
    showCompleteTechnicalDetails,
    setShowCompleteTechnicalDetails,
    licenseAccepted,
    setLicenseAccepted,
    licenseViewer,
    openLicenseViewer,
    closeLicenseViewer,
    choosePackage,
    clearSelectedPackage,
    closeInstallComplete,
    openScreenshotModal,
    handleContinueFromDetails,
    continueFromTrustStep,
    startInstall,
    launchCurrentPackage,
    activeScreenshotIndex,
    screenshotGallery,
    closeScreenshotModal,
    cycleScreenshot,
  };
};
