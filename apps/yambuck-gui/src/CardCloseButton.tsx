import { IconX } from "@tabler/icons-preact";
import { logUiAction } from "./lib/ui-log";
import { closeButton, closeButtonIcon } from "./cardCloseButton.css";

type CardCloseButtonProps = {
  title: string;
  onClick: () => void;
};

export const CardCloseButton = ({ title, onClick }: CardCloseButtonProps) => {
  return (
    <button
      class={`card-close ${closeButton}`}
      data-no-drag="true"
      onClick={() => {
        logUiAction("card-close", { title });
        onClick();
      }}
      aria-label={title}
    >
      <IconX class={closeButtonIcon} size={15} stroke={2.2} />
    </button>
  );
};
