import { closeButton } from "./cardCloseButton.css";

type CardCloseButtonProps = {
  title: string;
  onClick: () => void;
};

export const CardCloseButton = ({ title, onClick }: CardCloseButtonProps) => (
  <button class={`card-close ${closeButton}`} data-no-drag="true" onClick={onClick} title={title} aria-label={title}>
    ×
  </button>
);
