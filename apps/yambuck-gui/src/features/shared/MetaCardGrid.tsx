import type { ComponentChildren } from "preact";
import { metaGrid, metaGridCompact } from "./packageUi.css";

type MetaCardGridProps = {
  children: ComponentChildren;
  compact?: boolean;
  class?: string;
  id?: string;
};

export const MetaCardGrid = ({ children, compact = false, class: className, id }: MetaCardGridProps) => (
  <dl id={id} class={`meta-grid ${metaGrid}${compact ? ` compact ${metaGridCompact}` : ""}${className ? ` ${className}` : ""}`}>
    {children}
  </dl>
);
