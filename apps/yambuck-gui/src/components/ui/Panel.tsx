import type { ComponentChildren } from "preact";
import { CardCloseButton } from "../../CardCloseButton";
import { panel } from "./panel.css";

type PanelProps = {
  children: ComponentChildren;
  class?: string;
  showCornerClose?: boolean;
  cornerCloseTitle?: string;
  onCornerClose?: () => void;
};

export const Panel = ({
  children,
  class: className,
  showCornerClose = false,
  cornerCloseTitle = "Close",
  onCornerClose,
}: PanelProps) => (
  <section class={`${panel}${className ? ` ${className}` : ""}`}>
    {showCornerClose && onCornerClose ? <CardCloseButton title={cornerCloseTitle} onClick={onCornerClose} /> : null}
    {children}
  </section>
);
