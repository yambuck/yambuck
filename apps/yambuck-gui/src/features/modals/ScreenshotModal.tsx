type ScreenshotModalProps = {
  activeIndex: number;
  gallery: string[];
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export const ScreenshotModal = ({ activeIndex, gallery, onClose, onPrevious, onNext }: ScreenshotModalProps) => (
  <div class="screenshot-modal-overlay" data-no-drag="true" onClick={onClose}>
    <section class="screenshot-modal-card" onClick={(event) => event.stopPropagation()}>
      <div class="screenshot-modal-toolbar">
        <span>{`Screenshot ${activeIndex + 1} of ${gallery.length}`}</span>
        <button class="button ghost" onClick={onClose}>Close</button>
      </div>
      <img class="screenshot-modal-image" src={gallery[activeIndex]} alt={`Screenshot ${activeIndex + 1}`} />
      {gallery.length > 1 ? (
        <div class="screenshot-modal-controls">
          <button class="button ghost" onClick={onPrevious}>Previous</button>
          <button class="button ghost" onClick={onNext}>Next</button>
        </div>
      ) : null}
    </section>
  </div>
);
