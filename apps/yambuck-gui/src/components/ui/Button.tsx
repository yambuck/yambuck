import type { ComponentChildren, JSX } from "preact";

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
  const sizeClass = size === "inline" ? " inline" : "";
  const extraClass = className ? ` ${className}` : "";
  return (
    <button
      type={type}
      class={`button ${variant}${sizeClass}${extraClass}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
};
