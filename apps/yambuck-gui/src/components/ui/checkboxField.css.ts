import { style } from "@vanilla-extract/css";

export const root = style({
  marginTop: "0.9rem",
  display: "flex",
  alignItems: "center",
  gap: "0.55rem",
  color: "var(--colors-style-color032)",
  cursor: "pointer",
});

export const checkbox = style({
  width: "18px",
  height: "18px",
  borderRadius: "6px",
  border: "1px solid var(--colors-checkbox-border)",
  background: "var(--colors-checkbox-background)",
  accentColor: "var(--colors-style-color033)",
  cursor: "pointer",
  selectors: {
    '&:checked': {
      background: "var(--colors-checkbox-checked-background)",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
    '&:disabled': {
      opacity: 0.65,
      cursor: "not-allowed",
    },
  },
});

export const label = style({
  lineHeight: 1.35,
});
