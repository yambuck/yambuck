import type { ComponentChildren } from "preact";
import { panel } from "./panel.css";

type PanelProps = {
  children: ComponentChildren;
  class?: string;
};

export const Panel = ({ children, class: className }: PanelProps) => (
  <section class={`${panel}${className ? ` ${className}` : ""}`}>
    {children}
  </section>
);
