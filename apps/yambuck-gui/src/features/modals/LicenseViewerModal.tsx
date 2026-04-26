import { ModalShell } from "../../components/ui/ModalShell";
import { appText } from "../../i18n/app";
import { licenseCard, licenseText, section, toolbar, toolbarLabel } from "./modalStyles.css";

type LicenseViewerModalProps = {
  title: string;
  text: string;
  onClose: () => void;
};

export const LicenseViewerModal = ({ title, text, onClose }: LicenseViewerModalProps) => (
  <ModalShell onClose={onClose} cardClass={`license-modal-card ${licenseCard}`} closeTitle={appText("modal.close.license")}>
    <section class={`modal-section ${section}`}>
      <div class={`screenshot-modal-toolbar ${toolbar}`}>
        <span class={toolbarLabel}>{title}</span>
      </div>
      <pre class={`license-modal-text ${licenseText}`}>{text}</pre>
    </section>
  </ModalShell>
);
