import type { InstalledApp, InstalledAppDetails, UninstallResult, UninstallStep } from "../../types/app";
import { Button } from "../../components/ui/Button";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { ModalShell } from "../../components/ui/ModalShell";

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
  <ModalShell onClose={onClose} closeTitle="Close uninstall dialog">
    <section class="modal-section">
      {uninstallStep === "confirm" ? (
        <>
          <h2>{`Uninstall ${uninstallTarget.displayName}?`}</h2>
          <p class="subtitle">This removes the app from Yambuck and deletes installed app files.</p>
          <p class="subtitle">{`Scope: ${uninstallTarget.installScope}`}</p>
          <div class="update-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => onSetStep("options")}>Continue</Button>
          </div>
        </>
      ) : null}

      {uninstallStep === "options" ? (
        <>
          <h2>Uninstall options</h2>
          <p class="subtitle">App files will be removed. Choose whether to also remove app data paths.</p>
          <CheckboxField
            checked={uninstallRemoveUserData}
            onChange={onSetRemoveUserData}
            class="checkbox-row"
          >
            Remove user data and settings paths from package manifest
          </CheckboxField>
          {loadingUninstallDetails ? <p class="subtitle">Loading package metadata...</p> : null}
          {uninstallDetails?.packageInfo ? (
            <ul class="system-info-list">
              {uninstallDetails.packageInfo.configPath ? <li>Config: <code>{uninstallDetails.packageInfo.configPath}</code></li> : null}
              {uninstallDetails.packageInfo.cachePath ? <li>Cache: <code>{uninstallDetails.packageInfo.cachePath}</code></li> : null}
              {uninstallDetails.packageInfo.tempPath ? <li>Temp: <code>{uninstallDetails.packageInfo.tempPath}</code></li> : null}
            </ul>
          ) : null}
          <div class="update-actions">
            <Button onClick={() => onSetStep("confirm")}>Back</Button>
            <Button variant="primary" onClick={onRunUninstall}>Uninstall</Button>
          </div>
        </>
      ) : null}

      {uninstallStep === "running" ? (
        <>
          <h2>Uninstalling...</h2>
          <p class="subtitle">Removing application files and updating installed app index.</p>
        </>
      ) : null}

      {uninstallStep === "result" ? (
        <>
          <h2>{uninstallError ? "Uninstall failed" : "Uninstall complete"}</h2>
          {uninstallError ? <p class="subtitle">{uninstallError}</p> : null}
          {uninstallResult?.warnings.length ? (
            <>
              <p class="subtitle">Completed with warnings:</p>
              <ul class="system-info-list">
                {uninstallResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </>
          ) : null}
          <div class="update-actions">
            <Button variant="primary" onClick={onClose}>Close</Button>
          </div>
        </>
      ) : null}
    </section>
  </ModalShell>
);
