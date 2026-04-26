import type { ComponentChildren } from "preact";
import { FeedbackToneIcon } from "./FeedbackToneIcon";
import { iconWrap, panel, title as titleClass, tone } from "./messagePanel.css";

export type MessagePanelTone = "info" | "success" | "warning" | "error";

type MessagePanelProps = {
  tone: MessagePanelTone;
  title?: string;
  children: ComponentChildren;
  class?: string;
};

export const MessagePanel = ({ tone: messageTone, title, children, class: className }: MessagePanelProps) => (
  <div class={`${panel} ${tone[messageTone]}${className ? ` ${className}` : ""}`}>
    <span class={iconWrap} aria-hidden="true"><FeedbackToneIcon tone={messageTone} size={17} /></span>
    <div>
      {title ? <p class={titleClass}>{title}</p> : null}
      {children}
    </div>
  </div>
);
