import { style } from "@vanilla-extract/css";

export const root = style({
  display: "inline-flex",
  minWidth: 0,
});

export const rootBlock = style({
  display: "block",
  width: "100%",
  minWidth: 0,
});

export const trigger = style({
  display: "inline-flex",
  minWidth: 0,
});

export const triggerBlock = style({
  display: "block",
  width: "100%",
  minWidth: 0,
});

export const bubble = style({
  position: "fixed",
  minWidth: "220px",
  maxWidth: "320px",
  padding: "0.5rem 0.62rem",
  borderRadius: "10px",
  border: "1px solid var(--colors-panel-border)",
  background: "var(--colors-panel-background)",
  color: "var(--colors-feedback-title-text)",
  boxShadow: "0 12px 24px var(--colors-panel-shadow)",
  backdropFilter: "blur(8px)",
  fontSize: "0.76rem",
  letterSpacing: "normal",
  textTransform: "none",
  lineHeight: 1.4,
  zIndex: 55,
  opacity: 0,
  visibility: "hidden",
  pointerEvents: "none",
  transition: "opacity 120ms ease, transform 120ms ease",
});

export const bubbleTop = style({
  transform: "translateY(2px)",
});

export const bubbleBottom = style({
  transform: "translateY(-2px)",
});

export const bubbleVisible = style({
  opacity: 1,
  visibility: "visible",
  transform: "translateY(0)",
});
