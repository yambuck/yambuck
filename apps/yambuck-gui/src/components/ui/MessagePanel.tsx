import type { ComponentChildren } from "preact";
import { panel, title as titleClass, tone } from "./messagePanel.css";

export type MessagePanelTone = "info" | "success" | "warning" | "error";

type MessagePanelProps = {
  tone: MessagePanelTone;
  title?: string;
  children: ComponentChildren;
  class?: string;
};

export const MessagePanel = ({ tone: messageTone, title, children, class: className }: MessagePanelProps) => (
  <div class={`${panel} ${tone[messageTone]}${className ? ` ${className}` : ""}`}>
    {title ? <p class={titleClass}>{title}</p> : null}
    {children}
  </div>
);
