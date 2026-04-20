import type { ComponentChildren, JSX } from "preact";
import { base, fullWidthOnSmall, inline, variant as variantClass } from "./button.css";

type ButtonVariant = "primary" | "ghost";
type ButtonSize = "default" | "inline";

type ButtonProps = {
  children: ComponentChildren;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: JSX.MouseEventHandler<HTMLButtonElement>;
  class?: string;
  title?: string;
};

export const Button = ({
  children,
  variant = "ghost",
  size = "default",
  type = "button",
  disabled = false,
  onClick,
  class: className,
  title,
}: ButtonProps) => {
  const classes = ["button", variant, size === "inline" ? "inline" : "", base, variantClass[variant], fullWidthOnSmall, size === "inline" ? inline : "", className].filter(Boolean).join(" ");
  return (
    <button
      type={type}
      class={classes}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
};
