import { style, styleVariants } from "@vanilla-extract/css";

export const list = style({
  margin: "0 0 1rem",
  padding: 0,
  listStyle: "none",
  display: "flex",
  gap: "0.35rem",
  alignItems: "center",
  overflowX: "auto",
});

export const listAlign = styleVariants({
  start: {
    justifyContent: "flex-start",
  },
  center: {
    justifyContent: "center",
    '@media': {
      '(max-width: 720px)': {
        justifyContent: "flex-start",
      },
    },
  },
});

export const item = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.45rem",
  color: "var(--colors-style-color071)",
  selectors: {
    '&[data-state="active"]': {
      color: "var(--colors-feedback-title-text)",
    },
    '&[data-state="complete"]': {
      color: "var(--colors-feedback-success-accent)",
    },
  },
});

export const marker = style({
  width: "1.2rem",
  height: "1.2rem",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--colors-style-color073)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.67rem",
  fontWeight: 700,
  color: "inherit",
  selectors: {
    [`${item}[data-state="active"] &`]: {
      borderColor: "var(--colors-feedback-info-accent)",
      background: "rgba(42, 112, 166, 0.32)",
    },
    [`${item}[data-state="complete"] &`]: {
      borderColor: "var(--colors-feedback-success-accent)",
      background: "rgba(35, 115, 72, 0.34)",
    },
  },
});

export const label = style({
  fontSize: "0.77rem",
  whiteSpace: "nowrap",
});

export const separator = style({
  width: "0.9rem",
  height: "1px",
  background: "var(--colors-style-color073)",
  flexShrink: 0,
});
