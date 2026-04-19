import type { ComponentChildren } from "preact";
import { CardCloseButton } from "../../CardCloseButton";

type ModalShellProps = {
  onClose: () => void;
  children: ComponentChildren;
  cardClass?: string;
  overlayClass?: string;
  closeTitle?: string;
  closeOnOverlayClick?: boolean;
  showCornerClose?: boolean;
};

export const ModalShell = ({
  onClose,
  children,
  cardClass,
  overlayClass,
  closeTitle = "Close",
  closeOnOverlayClick = true,
  showCornerClose = true,
}: ModalShellProps) => {
  const overlayClassName = ["modal-overlay", overlayClass].filter(Boolean).join(" ");
  const cardClassName = ["modal-card", cardClass].filter(Boolean).join(" ");

  return (
    <div
      class={overlayClassName}
      data-no-drag="true"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <section class={cardClassName} onClick={(event) => event.stopPropagation()}>
        {showCornerClose ? <CardCloseButton title={closeTitle} onClick={onClose} /> : null}
        <div class="modal-shell-body">{children}</div>
      </section>
    </div>
  );
};
