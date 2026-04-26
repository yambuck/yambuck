import { useEffect, useRef, useState } from "preact/hooks";
import { appText } from "../../i18n/app";
import { toMockInstalledAppDetails } from "../../mocks/mockData";
import type { InstalledApp, UninstallResult, UninstallStep } from "../../types/app";
import { UninstallFlowPage } from "../installed/UninstallFlowPage";

type MockUninstallFlowPageProps = {
  target: InstalledApp;
  onClose: () => void;
  onToast: (kind: "info" | "success" | "warning" | "error", message: string) => void;
};

export const MockUninstallFlowPage = ({ target, onClose, onToast }: MockUninstallFlowPageProps) => {
  const runTimerRef = useRef<number | null>(null);
  const [uninstallStep, setUninstallStep] = useState<UninstallStep>("confirm");
  const [uninstallRemoveUserData, setUninstallRemoveUserData] = useState(false);
  const [uninstallResult, setUninstallResult] = useState<UninstallResult | null>(null);
  const [uninstallError, setUninstallError] = useState("");

  useEffect(() => {
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    setUninstallStep("confirm");
    setUninstallRemoveUserData(false);
    setUninstallResult(null);
    setUninstallError("");
  }, [target.appId, target.installScope]);

  useEffect(() => () => {
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
  }, []);

  const runMockUninstall = () => {
    setUninstallStep("running");
    setUninstallResult(null);
    setUninstallError("");

    runTimerRef.current = window.setTimeout(() => {
      const result: UninstallResult = {
        appId: target.appId,
        installScope: target.installScope,
        removedAppFiles: true,
        removedUserData: uninstallRemoveUserData,
        warnings: uninstallRemoveUserData ? [] : [appText("uninstall.mock.warningDataRetained")],
      };

      setUninstallResult(result);
      setUninstallStep("result");

      if (result.warnings.length > 0) {
        onToast("warning", appText("toast.uninstallWarnings", { appName: target.displayName }));
      } else {
        onToast("success", appText("toast.uninstallSuccess", { appName: target.displayName }));
      }
      runTimerRef.current = null;
    }, 900);
  };

  return (
    <UninstallFlowPage
      uninstallTarget={target}
      uninstallStep={uninstallStep}
      uninstallRemoveUserData={uninstallRemoveUserData}
      loadingUninstallDetails={false}
      uninstallDetails={toMockInstalledAppDetails(target)}
      uninstallResult={uninstallResult}
      uninstallError={uninstallError}
      onClose={() => {
        if (runTimerRef.current !== null) {
          return;
        }
        onClose();
      }}
      onSetStep={setUninstallStep}
      onSetRemoveUserData={setUninstallRemoveUserData}
      onRunUninstall={runMockUninstall}
    />
  );
};
