import { IconChevronRight } from "@tabler/icons-preact";
import type { ComponentChildren } from "preact";
import {
  chevron,
  chevronExpanded,
  header,
  headerActions,
  panel,
  row,
  rowExpanded,
  rowHoverable,
  subtitle,
  summaryButton,
  title,
} from "./accordionRow.css";

type AccordionRowProps = {
  expanded: boolean;
  titleText: string;
  subtitleText?: string;
  onToggle: () => void;
  children: ComponentChildren;
};

export const AccordionRow = ({
  expanded,
  titleText,
  subtitleText,
  onToggle,
  children,
}: AccordionRowProps) => (
  <section class={`${row}${expanded ? ` ${rowExpanded}` : ` ${rowHoverable}`}`}>
    <div class={header}>
      <button type="button" class={summaryButton} onClick={onToggle} aria-expanded={expanded}>
        <span class={title}>{titleText}</span>
        {subtitleText ? <span class={subtitle}>{subtitleText}</span> : null}
      </button>
      <div class={headerActions}>
        <span class={`${chevron}${expanded ? ` ${chevronExpanded}` : ""}`} aria-hidden>
          <IconChevronRight size={22} stroke={2.1} />
        </span>
      </div>
    </div>
    {expanded ? <div class={panel}>{children}</div> : null}
  </section>
);
