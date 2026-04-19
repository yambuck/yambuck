import type { ComponentChildren } from "preact";

type PanelProps = {
  children: ComponentChildren;
  class?: string;
};

export const Panel = ({ children, class: className }: PanelProps) => (
  <section class={`panel primary-panel${className ? ` ${className}` : ""}`}>
    {children}
  </section>
);
