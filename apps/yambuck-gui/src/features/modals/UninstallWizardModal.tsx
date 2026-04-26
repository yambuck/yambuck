import type { InstalledApp, InstalledAppDetails, UninstallResult, UninstallStep } from "../../types/app";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { appText } from "../../i18n/app";
import { ModalShell } from "../../components/ui/ModalShell";
import { formatInstallScopeLabel } from "../../utils/scope";
import { section, updateActions } from "./modalStyles.css";
import { subtitle } from "../shared/packageUi.css";

type UninstallWizardModalProps = {
  uninstallTarget: InstalledApp;
  uninstallStep: UninstallStep;
  uninstallRemoveUserData: boolean;
  loadingUninstallDetails: boolean;
  uninstallDetails: InstalledAppDetails | null;
  uninstallResult: UninstallResult | null;
  uninstallError: string;
  onClose: () => void;
  onSetStep: (step: UninstallStep) => void;
  onSetRemoveUserData: (value: boolean) => void;
  onRunUninstall: () => void;
};

export const UninstallWizardModal = ({
  uninstallTarget,
  uninstallStep,
  uninstallRemoveUserData,
  loadingUninstallDetails,
  uninstallDetails,
  uninstallResult,
  uninstallError,
  onClose,
  onSetStep,
  onSetRemoveUserData,
  onRunUninstall,
}: UninstallWizardModalProps) => (
  <ModalShell onClose={onClose} closeTitle={appText("modal.close.uninstall")}>
    <section class={`modal-section ${section}`}>
      {uninstallStep === "confirm" ? (
        <>
          <h2>{appText("uninstall.confirmTitle", { appName: uninstallTarget.displayName })}</h2>
          <p class={`subtitle ${subtitle}`}>{appText("uninstall.confirmBody")}</p>
          <p class={`subtitle ${subtitle}`}>{appText("uninstall.scope", { scope: formatInstallScopeLabel(uninstallTarget.installScope) })}</p>
          <div class={`update-actions ${updateActions}`}>
            <Button onClick={onClose}>{appText("uninstall.cancel")}</Button>
            <Button variant="primary" onClick={() => onSetStep("options")}>{appText("uninstall.continue")}</Button>
          </div>
        </>
      ) : null}

      {uninstallStep === "options" ? (
        <>
          <h2>{appText("uninstall.optionsTitle")}</h2>
          <p class={`subtitle ${subtitle}`}>{appText("uninstall.optionsBody")}</p>
          <CheckboxField
            checked={uninstallRemoveUserData}
            onChange={onSetRemoveUserData}
            class="checkbox-row"
          >
            {appText("uninstall.removeUserData")}
          </CheckboxField>
          {loadingUninstallDetails ? <p class={`subtitle ${subtitle}`}>{appText("uninstall.loadingMetadata")}</p> : null}
          {uninstallDetails?.packageInfo ? (
            <ul class="system-info-list">
              {uninstallDetails.packageInfo.configPath ? <li>{appText("uninstall.config")}: <code>{uninstallDetails.packageInfo.configPath}</code></li> : null}
              {uninstallDetails.packageInfo.cachePath ? <li>{appText("uninstall.cache")}: <code>{uninstallDetails.packageInfo.cachePath}</code></li> : null}
              {uninstallDetails.packageInfo.tempPath ? <li>{appText("uninstall.temp")}: <code>{uninstallDetails.packageInfo.tempPath}</code></li> : null}
            </ul>
          ) : null}
          <div class={`update-actions ${updateActions}`}>
            <Button onClick={() => onSetStep("confirm")}>{appText("uninstall.back")}</Button>
            <Button variant="danger" onClick={onRunUninstall}>{appText("uninstall.run")}</Button>
          </div>
        </>
      ) : null}

      {uninstallStep === "running" ? (
        <>
          <h2>{appText("uninstall.runningTitle")}</h2>
          <p class={`subtitle ${subtitle}`}>{appText("uninstall.runningBody")}</p>
        </>
      ) : null}

      {uninstallStep === "result" ? (
        <>
          <h2>{uninstallError ? appText("uninstall.failedTitle") : appText("uninstall.completeTitle")}</h2>
          {uninstallError ? <p class={`subtitle ${subtitle}`}>{uninstallError}</p> : null}
          {uninstallResult?.warnings.length ? (
            <>
              <p class={`subtitle ${subtitle}`}>{appText("uninstall.warningsTitle")}</p>
              <ul class="system-info-list">
                {uninstallResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </>
          ) : null}
          <div class={`update-actions ${updateActions}`}>
            <Button variant="primary" onClick={onClose}>{appText("uninstall.close")}</Button>
          </div>
        </>
      ) : null}
    </section>
  </ModalShell>
);
