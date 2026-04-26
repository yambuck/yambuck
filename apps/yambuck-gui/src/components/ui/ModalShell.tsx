import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { CardCloseButton } from "../../CardCloseButton";
import { body, card, content, overlay } from "./modalShell.css";

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
  if (typeof document === "undefined") {
    return null;
  }

  const host = document.getElementById("app-modal-host") ?? document.body;

  const overlayClassName = ["modal-overlay", overlay, overlayClass].filter(Boolean).join(" ");
  const cardClassName = ["modal-card", card, cardClass].filter(Boolean).join(" ");

  return createPortal(
    <div
      class={overlayClassName}
      data-no-drag="true"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <section class={cardClassName} onClick={(event) => event.stopPropagation()}>
        {showCornerClose ? <CardCloseButton title={closeTitle} onClick={onClose} /> : null}
        <div class={`modal-shell-body ${body}`}>
          <div class={`modal-shell-content ${content}`}>{children}</div>
        </div>
      </section>
    </div>,
    host,
  );
};
