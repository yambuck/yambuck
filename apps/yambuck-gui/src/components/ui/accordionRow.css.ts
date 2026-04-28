import { style } from "@vanilla-extract/css";

export const row = style({
  borderBottom: "1px solid var(--colors-style-color068)",
  padding: "0.45rem 0",
  display: "grid",
  gap: "0.45rem",
});

export const header = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.45rem",
  flexWrap: "wrap",
});

export const summaryButton = style({
  border: 0,
  padding: 0,
  margin: 0,
  background: "transparent",
  color: "inherit",
  display: "grid",
  gap: "0.2rem",
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
  selectors: {
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
      borderRadius: "8px",
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
  gap: "0.45rem",
  flexWrap: "wrap",
});

export const panel = style({
  display: "grid",
  gap: "0.55rem",
  padding: "0.45rem 0.1rem 0.25rem",
});
