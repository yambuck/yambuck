import type { UpdateCheckResult } from "../../types/app";
import { Button } from "../../components/ui/Button";
import { ModalShell } from "../../components/ui/ModalShell";

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
    <section class="modal-section">
      <h2>{updateResult.updateAvailable ? "Update available" : "You're up to date"}</h2>
      <p class="subtitle">{`Current: v${updateResult.currentVersion}`}</p>
      <p class="subtitle">{`Latest: v${updateResult.latestVersion}`}</p>
      <p class="subtitle">{`Last checked: ${lastCheckedLabel}`}</p>
      <p class="subtitle">
        {updateResult.updateAvailable
          ? "A new Yambuck version is ready. You can review notes, then update and restart."
          : "No update is needed right now."}
      </p>
      <div class="update-actions">
        {updateResult.updateAvailable && updateResult.notesUrl ? (
          <a class="button ghost" href={updateResult.notesUrl} target="_blank" rel="noreferrer">
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
