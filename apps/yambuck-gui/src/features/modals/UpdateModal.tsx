import type { UpdateCheckResult } from "../../types/app";

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
  <div class="modal-overlay" data-no-drag="true" onClick={onClose}>
    <section class="modal-card" onClick={(event) => event.stopPropagation()}>
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
        <button class="button ghost" onClick={onClose}>
          {updateResult.updateAvailable ? "Later" : "Close"}
        </button>
        {updateResult.updateAvailable ? (
          <button class="button primary" onClick={onUpdateAndRestart} disabled={applyingUpdate}>
            {applyingUpdate ? "Applying..." : "Update and restart"}
          </button>
        ) : null}
      </div>
    </section>
  </div>
);
