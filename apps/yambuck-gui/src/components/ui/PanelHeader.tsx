import type { ComponentChildren } from "preact";
import {
  actions,
  appText,
  appWrap,
  icon,
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
  iconSrc: string;
  iconAlt: string;
  actions?: ComponentChildren;
};

type PanelHeaderProps = StandardPanelHeaderProps | AppPanelHeaderProps;

export const PanelHeader = ({ title, children, class: className, ...props }: PanelHeaderProps) => {
  if (props.variant === "app") {
    return (
      <header class={`panel-header panel-header-app ${appWrap}${className ? ` ${className}` : ""}`}>
        <img class={`panel-header-icon ${icon}`} src={props.iconSrc} alt={props.iconAlt} />
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
