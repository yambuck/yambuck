import type { ComponentChildren, JSX, VNode } from "preact";
import { logUiAction } from "../../lib/ui-log";
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
  logLabel?: string;
  disableClickLog?: boolean;
};

const extractText = (children: ComponentChildren): string => {
  if (typeof children === "string" || typeof children === "number") {
    return String(children).trim();
  }

  if (Array.isArray(children)) {
    return children
      .map((child) => extractText(child))
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if (children && typeof children === "object") {
    const vnode = children as VNode<unknown>;
    return extractText((vnode.props as { children?: ComponentChildren } | undefined)?.children ?? "");
  }

  return "";
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
  logLabel,
  disableClickLog = false,
}: ButtonProps) => {
  const classes = ["button", variant, size === "inline" ? "inline" : "", base, variantClass[variant], fullWidthOnSmall, size === "inline" ? inline : "", className].filter(Boolean).join(" ");

  const handleClick: JSX.MouseEventHandler<HTMLButtonElement> = (event) => {
    if (!disableClickLog) {
      const label = logLabel || title || extractText(children) || "unnamed-button";
      logUiAction("button-click", { label, variant });
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      class={classes}
      disabled={disabled}
      onClick={handleClick}
      title={title}
    >
      {children}
    </button>
  );
};
