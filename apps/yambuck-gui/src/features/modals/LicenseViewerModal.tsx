import { ModalShell } from "../../components/ui/ModalShell";

type LicenseViewerModalProps = {
  title: string;
  text: string;
  onClose: () => void;
};

export const LicenseViewerModal = ({ title, text, onClose }: LicenseViewerModalProps) => (
  <ModalShell onClose={onClose} cardClass="license-modal-card" closeTitle="Close license">
    <section class="modal-section">
      <div class="screenshot-modal-toolbar">
        <span>{title}</span>
      </div>
      <pre class="license-modal-text">{text}</pre>
    </section>
  </ModalShell>
);
