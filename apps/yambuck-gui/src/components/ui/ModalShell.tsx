import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useEffect, useId, useRef } from "preact/hooks";
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
  const fallbackTitleId = useId();
  const cardRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Captured on the first render, before any child can focus itself.
  const returnFocusRef = useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  // An accessible dialog (App Standard section 6): labelled by its first
  // heading, closes on Escape, takes focus when it opens and returns it when
  // it closes.
  useEffect(() => {
    const card = cardRef.current;
    const heading = card?.querySelector<HTMLElement>("h1, h2, h3");
    if (card && heading) {
      if (!heading.id) {
        heading.id = fallbackTitleId;
      }
      card.setAttribute("aria-labelledby", heading.id);
    }
    if (card && !card.contains(document.activeElement)) {
      card.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    const previouslyFocused = returnFocusRef.current;
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

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
      <section
        ref={cardRef}
        class={cardClassName}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {showCornerClose ? <CardCloseButton title={closeTitle} onClick={onClose} /> : null}
        <div class={`modal-shell-body ${body}`}>
          <div class={`modal-shell-content ${content}`}>{children}</div>
        </div>
      </section>
    </div>,
    host,
  );
};
