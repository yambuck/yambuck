import { ModalShell } from "../../../components/ui/ModalShell";
import { appText } from "../../../i18n/app";
import {
  manifestModalBody,
  manifestModalCard,
  previewCode,
  previewTitle,
} from "../packageBuilderPage.css";

type BuilderManifestPreviewModalProps = {
  isOpen: boolean;
  manifestPreview: string;
  onClose: () => void;
};

export const BuilderManifestPreviewModal = ({
  isOpen,
  manifestPreview,
  onClose,
}: BuilderManifestPreviewModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell
      onClose={onClose}
      cardClass={manifestModalCard}
      closeTitle={appText("builder.previewClose")}
    >
      <section class={manifestModalBody}>
        <h3 class={previewTitle}>{appText("builder.previewTitle")}</h3>
        <pre class={previewCode}>{manifestPreview}</pre>
      </section>
    </ModalShell>
  );
};
