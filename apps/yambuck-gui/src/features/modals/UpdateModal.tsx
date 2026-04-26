import type { UpdateCheckResult } from "../../types/app";
import { Button } from "../../components/ui/Button";
import { ghostLink } from "../../components/ui/button.css";
import { appText } from "../../i18n/app";
import { ModalShell } from "../../components/ui/ModalShell";
import { section, updateActions } from "./modalStyles.css";
import { subtitle } from "../shared/packageUi.css";

type UpdateModalProps = {
  updateResult: UpdateCheckResult;
  applyingUpdate: boolean;
  lastCheckedLabel: string;
  onClose: () => void;
  onUpdateAndRestart: () => void;
};

export const UpdateModal = ({
  updateResult,
  applyingUpdate,
  lastCheckedLabel,
  onClose,
  onUpdateAndRestart,
}: UpdateModalProps) => (
  <ModalShell onClose={onClose} closeTitle={appText("modal.close.update")}>
    <section class={`modal-section ${section}`}>
      <h2>{updateResult.updateAvailable ? appText("update.available") : appText("update.upToDate")}</h2>
      <p class={`subtitle ${subtitle}`}>{appText("update.current", { version: updateResult.currentVersion })}</p>
      <p class={`subtitle ${subtitle}`}>{appText("update.latest", { version: updateResult.latestVersion })}</p>
      <p class={`subtitle ${subtitle}`}>{appText("update.lastChecked", { value: lastCheckedLabel })}</p>
      <p class={`subtitle ${subtitle}`}>
        {updateResult.updateAvailable
          ? appText("update.availableBody")
          : appText("update.noneBody")}
      </p>
      <div class={`update-actions ${updateActions}`}>
        {updateResult.updateAvailable && updateResult.notesUrl ? (
          <a class={ghostLink} href={updateResult.notesUrl} target="_blank" rel="noreferrer">
            {appText("update.releaseNotes")}
          </a>
        ) : null}
        <Button onClick={onClose}>
          {updateResult.updateAvailable ? appText("update.later") : appText("update.close")}
        </Button>
        {updateResult.updateAvailable ? (
          <Button variant="primary" onClick={onUpdateAndRestart} disabled={applyingUpdate}>
            {applyingUpdate ? appText("update.applying") : appText("update.applyAndRestart")}
          </Button>
        ) : null}
      </div>
    </section>
  </ModalShell>
);
