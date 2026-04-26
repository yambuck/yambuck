import { style } from "@vanilla-extract/css";

export const closeButton = style({
  position: "absolute",
  top: "calc(var(--panel-radius) - (var(--panel-radius) / 1.41421356) - (var(--panel-close-size) / 2))",
  right: "calc(var(--panel-radius) - (var(--panel-radius) / 1.41421356) - (var(--panel-close-size) / 2))",
  transform: "none",
  zIndex: 3,
  width: "var(--panel-close-size)",
  height: "var(--panel-close-size)",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--colors-control-border)",
  background: "var(--colors-select-menu-background)",
  color: "var(--colors-style-color008)",
  fontSize: "1.25rem",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 6px 14px var(--colors-panel-shadow), 0 0 0 1px var(--colors-style-color091)",
  transition: "background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
  '@media': {
    '(max-width: 720px)': {
      ["--panel-close-size" as string]: "34px",
    },
  },
  selectors: {
    '&:hover': {
      background: "var(--colors-style-color007)",
      borderColor: "var(--colors-select-border-hover)",
      boxShadow: "0 8px 18px var(--colors-panel-shadow), 0 0 0 1px var(--colors-style-color091)",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
  },
});

export const closeButtonIcon = style({
  display: "block",
  flex: "0 0 auto",
  transform: "translateY(-0.35px)",
});

export const closeButtonTooltip = style({
  position: "absolute",
  right: 0,
  top: "calc(100% + 0.45rem)",
  minWidth: "220px",
  maxWidth: "320px",
  padding: "0.45rem 0.55rem",
  borderRadius: "var(--radius-xs)",
  border: "1px solid var(--colors-style-color027)",
  background: "var(--colors-style-color028)",
  color: "var(--colors-toast-info-text)",
  fontSize: "0.73rem",
  letterSpacing: "normal",
  textTransform: "none",
  lineHeight: 1.35,
  textAlign: "left",
  zIndex: 4,
  opacity: 0,
  pointerEvents: "none",
  transform: "translateY(-2px)",
  transition: "opacity 120ms ease, transform 120ms ease",
  selectors: {
    [`${closeButton}:hover &`]: {
      opacity: 1,
      transform: "translateY(0)",
    },
    [`${closeButton}:focus-visible &`]: {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
});
