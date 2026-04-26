import { Button } from "../../components/ui/Button";
import { appText } from "../../i18n/app";
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
    closeTitle={appText("modal.close.screenshot")}
  >
    <section class={`modal-section ${section}`}>
      <div class={`screenshot-modal-toolbar ${toolbar}`}>
        <span class={toolbarLabel}>{appText("modal.screenshot.title", { index: activeIndex + 1, total: gallery.length })}</span>
      </div>
      <img
        class={`screenshot-modal-image ${screenshotImage}`}
        src={gallery[activeIndex]}
        alt={appText("modal.screenshot.alt", { index: activeIndex + 1 })}
      />
      {gallery.length > 1 ? (
        <div class={`screenshot-modal-controls ${screenshotControls}`}>
          <Button onClick={onPrevious}>{appText("modal.screenshot.previous")}</Button>
          <Button onClick={onNext}>{appText("modal.screenshot.next")}</Button>
        </div>
      ) : null}
    </section>
  </ModalShell>
);
