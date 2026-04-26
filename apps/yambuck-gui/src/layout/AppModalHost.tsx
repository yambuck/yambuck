import { Button } from "../components/ui/Button";
import { CheckboxField } from "../components/ui/CheckboxField";
import { ModalShell } from "../components/ui/ModalShell";
import { LicenseViewerModal } from "../features/modals/LicenseViewerModal";
import { ScreenshotModal } from "../features/modals/ScreenshotModal";
import { UpdateModal } from "../features/modals/UpdateModal";
import { appText } from "../i18n/app";
import type { UpdateCheckResult } from "../types/app";

type AppModalHostProps = {
  isUpdateModalOpen: boolean;
  updateResult: UpdateCheckResult | null;
  applyingUpdate: boolean;
  lastCheckedLabel: string;
  onCloseUpdateModal: () => void;
  onUpdateAndRestart: () => void;
  licenseViewer: { title: string; text: string } | null;
  onCloseLicenseViewer: () => void;
  activeScreenshotIndex: number | null;
  screenshotGallery: string[];
  onCloseScreenshotModal: () => void;
  onPreviousScreenshot: () => void;
  onNextScreenshot: () => void;
  showBuilderGate: boolean;
  rememberBuilderGateDismissal: boolean;
  onSetRememberBuilderGateDismissal: (value: boolean) => void;
  onBuilderGateCancel: () => void;
  onBuilderGateContinue: () => void;
};

export const AppModalHost = ({
  isUpdateModalOpen,
  updateResult,
  applyingUpdate,
  lastCheckedLabel,
  onCloseUpdateModal,
  onUpdateAndRestart,
  licenseViewer,
  onCloseLicenseViewer,
  activeScreenshotIndex,
  screenshotGallery,
  onCloseScreenshotModal,
  onPreviousScreenshot,
  onNextScreenshot,
  showBuilderGate,
  rememberBuilderGateDismissal,
  onSetRememberBuilderGateDismissal,
  onBuilderGateCancel,
  onBuilderGateContinue,
}: AppModalHostProps) => (
  <>
    {isUpdateModalOpen && updateResult ? (
      <UpdateModal
        updateResult={updateResult}
        applyingUpdate={applyingUpdate}
        lastCheckedLabel={lastCheckedLabel}
        onClose={onCloseUpdateModal}
        onUpdateAndRestart={onUpdateAndRestart}
      />
    ) : null}

    {licenseViewer ? (
      <LicenseViewerModal title={licenseViewer.title} text={licenseViewer.text} onClose={onCloseLicenseViewer} />
    ) : null}

    {activeScreenshotIndex !== null && screenshotGallery.length > 0 ? (
      <ScreenshotModal
        activeIndex={activeScreenshotIndex}
        gallery={screenshotGallery}
        onClose={onCloseScreenshotModal}
        onPrevious={onPreviousScreenshot}
        onNext={onNextScreenshot}
      />
    ) : null}

    {showBuilderGate ? (
      <ModalShell onClose={onBuilderGateCancel} closeTitle={appText("builderGate.cancel")}>
        <section>
          <h2>{appText("builderGate.title")}</h2>
          <p>{appText("builderGate.body")}</p>
          <CheckboxField
            checked={rememberBuilderGateDismissal}
            onChange={onSetRememberBuilderGateDismissal}
          >
            {appText("builderGate.remember")}
          </CheckboxField>
          <div class="modal-actions">
            <Button onClick={onBuilderGateCancel}>{appText("builderGate.cancel")}</Button>
            <Button variant="primary" onClick={onBuilderGateContinue}>{appText("builderGate.continue")}</Button>
          </div>
        </section>
      </ModalShell>
    ) : null}
  </>
);
