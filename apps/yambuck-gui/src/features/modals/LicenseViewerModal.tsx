type LicenseViewerModalProps = {
  title: string;
  text: string;
  onClose: () => void;
};

export const LicenseViewerModal = ({ title, text, onClose }: LicenseViewerModalProps) => (
  <div class="modal-overlay" data-no-drag="true" onClick={onClose}>
    <section class="modal-card license-modal-card" onClick={(event) => event.stopPropagation()}>
      <div class="screenshot-modal-toolbar">
        <span>{title}</span>
        <button class="button ghost" onClick={onClose}>Close</button>
      </div>
      <pre class="license-modal-text">{text}</pre>
    </section>
  </div>
);
