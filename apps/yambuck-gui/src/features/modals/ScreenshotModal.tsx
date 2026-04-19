import { Button } from "../../components/ui/Button";
import { ModalShell } from "../../components/ui/ModalShell";

type ScreenshotModalProps = {
  activeIndex: number;
  gallery: string[];
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export const ScreenshotModal = ({ activeIndex, gallery, onClose, onPrevious, onNext }: ScreenshotModalProps) => (
  <ModalShell
    onClose={onClose}
    overlayClass="screenshot-modal-overlay"
    cardClass="screenshot-modal-card"
    closeTitle="Close screenshot viewer"
  >
    <section class="modal-section">
      <div class="screenshot-modal-toolbar">
        <span>{`Screenshot ${activeIndex + 1} of ${gallery.length}`}</span>
      </div>
      <img class="screenshot-modal-image" src={gallery[activeIndex]} alt={`Screenshot ${activeIndex + 1}`} />
      {gallery.length > 1 ? (
        <div class="screenshot-modal-controls">
          <Button onClick={onPrevious}>Previous</Button>
          <Button onClick={onNext}>Next</Button>
        </div>
      ) : null}
    </section>
  </ModalShell>
);
