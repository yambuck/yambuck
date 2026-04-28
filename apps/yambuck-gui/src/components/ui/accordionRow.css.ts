import { style } from "@vanilla-extract/css";

export const row = style({
  border: "1px solid var(--colors-style-color073)",
  borderRadius: "10px",
  padding: "0.45rem 0.55rem",
  display: "grid",
  gap: "0.45rem",
  transition: "background-color 120ms ease, border-color 120ms ease",
});

export const rowHoverable = style({
  selectors: {
    '&:hover': {
      background: "var(--colors-control-hover-background)",
      borderColor: "var(--colors-select-border-hover)",
    },
  },
});

export const rowExpanded = style({
  borderColor: "var(--colors-select-border-hover)",
  background: "color-mix(in srgb, var(--colors-control-hover-background) 45%, transparent)",
});

export const header = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.45rem",
  flexWrap: "nowrap",
});

export const summaryButton = style({
  border: 0,
  padding: "0.2rem 0.1rem",
  margin: 0,
  background: "transparent",
  color: "inherit",
  display: "grid",
  gap: "0.2rem",
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
  flex: "1 1 auto",
  borderRadius: "8px",
  selectors: {
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
  },
});

export const title = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  fontWeight: 700,
});

export const subtitle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  fontSize: "0.72rem",
  fontWeight: 500,
  color: "var(--colors-style-color070)",
});

export const headerActions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  flexShrink: 0,
});

export const chevron = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--colors-style-color070)",
  transition: "transform 140ms ease, color 140ms ease",
});

export const chevronExpanded = style({
  transform: "rotate(90deg)",
  color: "var(--colors-control-text)",
});

export const panel = style({
  display: "grid",
  gap: "0.55rem",
  padding: "0.45rem 0.1rem 0.25rem",
});
