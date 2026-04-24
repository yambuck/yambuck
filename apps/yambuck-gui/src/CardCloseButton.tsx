import { IconX } from "@tabler/icons-preact";
import { useId } from "preact/hooks";
import { logUiAction } from "./lib/ui-log";
import { closeButton, closeButtonIcon, closeButtonTooltip } from "./cardCloseButton.css";

type CardCloseButtonProps = {
  title: string;
  onClick: () => void;
};

export const CardCloseButton = ({ title, onClick }: CardCloseButtonProps) => {
  const tooltipId = useId();

  return (
    <button
      class={`card-close ${closeButton}`}
      data-no-drag="true"
      onClick={() => {
        logUiAction("card-close", { title });
        onClick();
      }}
      aria-label={title}
      aria-describedby={tooltipId}
    >
      <IconX class={closeButtonIcon} size={15} stroke={2.2} />
      <span id={tooltipId} class={closeButtonTooltip} role="tooltip">{title}</span>
    </button>
  );
};
