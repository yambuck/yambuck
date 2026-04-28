import { IconChevronDown, IconChevronRight } from "@tabler/icons-preact";
import type { ComponentChildren } from "preact";
import { Button } from "./Button";
import {
  header,
  headerActions,
  panel,
  row,
  subtitle,
  summaryButton,
  title,
} from "./accordionRow.css";

type AccordionRowProps = {
  expanded: boolean;
  titleText: string;
  subtitleText?: string;
  onToggle: () => void;
  actions?: ComponentChildren;
  children: ComponentChildren;
};

export const AccordionRow = ({
  expanded,
  titleText,
  subtitleText,
  onToggle,
  actions,
  children,
}: AccordionRowProps) => (
  <section class={row}>
    <div class={header}>
      <button type="button" class={summaryButton} onClick={onToggle} aria-expanded={expanded}>
        <span class={title}>{titleText}</span>
        {subtitleText ? <span class={subtitle}>{subtitleText}</span> : null}
      </button>
      <div class={headerActions}>
        <Button onClick={onToggle} fullWidthOnSmall={false}>
          {expanded ? (
            <><IconChevronDown size={14} stroke={2} /> Collapse</>
          ) : (
            <><IconChevronRight size={14} stroke={2} /> Expand</>
          )}
        </Button>
        {actions}
      </div>
    </div>
    {expanded ? <div class={panel}>{children}</div> : null}
  </section>
);
