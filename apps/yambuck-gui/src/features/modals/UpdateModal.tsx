import type { UpdateCheckResult } from "../../types/app";
import { Button } from "../../components/ui/Button";
import { ghostLink } from "../../components/ui/button.css";
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
  <ModalShell onClose={onClose} closeTitle="Close update dialog">
    <section class={`modal-section ${section}`}>
      <h2>{updateResult.updateAvailable ? "Update available" : "You're up to date"}</h2>
      <p class={`subtitle ${subtitle}`}>{`Current: v${updateResult.currentVersion}`}</p>
      <p class={`subtitle ${subtitle}`}>{`Latest: v${updateResult.latestVersion}`}</p>
      <p class={`subtitle ${subtitle}`}>{`Last checked: ${lastCheckedLabel}`}</p>
      <p class={`subtitle ${subtitle}`}>
        {updateResult.updateAvailable
          ? "A new Yambuck version is ready. You can review notes, then update and restart."
          : "No update is needed right now."}
      </p>
      <div class={`update-actions ${updateActions}`}>
        {updateResult.updateAvailable && updateResult.notesUrl ? (
          <a class={ghostLink} href={updateResult.notesUrl} target="_blank" rel="noreferrer">
            Release notes
          </a>
        ) : null}
        <Button onClick={onClose}>
          {updateResult.updateAvailable ? "Later" : "Close"}
        </Button>
        {updateResult.updateAvailable ? (
          <Button variant="primary" onClick={onUpdateAndRestart} disabled={applyingUpdate}>
            {applyingUpdate ? "Applying..." : "Update and restart"}
          </Button>
        ) : null}
      </div>
    </section>
  </ModalShell>
);
