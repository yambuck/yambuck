import type { ComponentChildren } from "preact";
import {
  actions,
  appText,
  appWrap,
  icon,
  iconFallback,
  spacer,
  subtitle,
  wrap,
} from "./panelHeader.css";

type BasePanelHeaderProps = {
  title: string;
  children?: ComponentChildren;
  class?: string;
};

type StandardPanelHeaderProps = BasePanelHeaderProps & {
  variant?: "standard";
};

type AppPanelHeaderProps = BasePanelHeaderProps & {
  variant: "app";
  iconSrc?: string;
  iconAlt?: string;
  iconPlaceholder?: ComponentChildren;
  actions?: ComponentChildren;
};

type PanelHeaderProps = StandardPanelHeaderProps | AppPanelHeaderProps;

export const PanelHeader = ({ title, children, class: className, ...props }: PanelHeaderProps) => {
  if (props.variant === "app") {
    return (
      <header class={`panel-header panel-header-app ${appWrap}${className ? ` ${className}` : ""}`}>
        {props.iconSrc ? (
          <img class={`panel-header-icon ${icon}`} src={props.iconSrc} alt={props.iconAlt ?? title} />
        ) : (
          <div class={`panel-header-icon panel-header-icon-fallback ${icon} ${iconFallback}`} aria-hidden="true">
            {props.iconPlaceholder ?? null}
          </div>
        )}
        <div class={`panel-header-text ${appText}`}>
          <h1>{title}</h1>
          {children ? <div class={`panel-header-subtitle ${subtitle}`}>{children}</div> : null}
        </div>
        {props.actions ? (
          <div class={`panel-header-actions ${actions}`} data-no-drag="true">{props.actions}</div>
        ) : (
          <div class={`panel-header-spacer ${spacer}`} aria-hidden="true" />
        )}
      </header>
    );
  }

  return (
    <header class={`panel-header ${wrap}${className ? ` ${className}` : ""}`}>
      <h1>{title}</h1>
      {children ? <div class={`panel-header-subtitle ${subtitle}`}>{children}</div> : null}
    </header>
  );
};
