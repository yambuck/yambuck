import { button } from "./sectionToggleButton.css";

type SectionToggleButtonProps = {
  expanded: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
  class?: string;
  controlsId?: string;
};

export const SectionToggleButton = ({
  expanded,
  onToggle,
  showLabel = "Show details",
  hideLabel = "Hide details",
  class: className,
  controlsId,
}: SectionToggleButtonProps) => (
  <button
    class={`${button}${className ? ` ${className}` : ""}`}
    type="button"
    onClick={onToggle}
    aria-expanded={expanded}
    aria-controls={controlsId}
  >
    {expanded ? hideLabel : showLabel}
  </button>
);
