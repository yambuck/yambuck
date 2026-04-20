import { Button } from "../../components/ui/Button";
import { ModalShell } from "../../components/ui/ModalShell";
import {
  screenshotCard,
  screenshotControls,
  screenshotImage,
  screenshotOverlay,
  section,
  toolbar,
  toolbarLabel,
} from "./modalStyles.css";

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
    overlayClass={`screenshot-modal-overlay ${screenshotOverlay}`}
    cardClass={`screenshot-modal-card ${screenshotCard}`}
    closeTitle="Close screenshot viewer"
  >
    <section class={`modal-section ${section}`}>
      <div class={`screenshot-modal-toolbar ${toolbar}`}>
        <span class={toolbarLabel}>{`Screenshot ${activeIndex + 1} of ${gallery.length}`}</span>
      </div>
      <img class={`screenshot-modal-image ${screenshotImage}`} src={gallery[activeIndex]} alt={`Screenshot ${activeIndex + 1}`} />
      {gallery.length > 1 ? (
        <div class={`screenshot-modal-controls ${screenshotControls}`}>
          <Button onClick={onPrevious}>Previous</Button>
          <Button onClick={onNext}>Next</Button>
        </div>
      ) : null}
    </section>
  </ModalShell>
);
