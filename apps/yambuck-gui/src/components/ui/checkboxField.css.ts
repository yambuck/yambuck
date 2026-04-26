import { style } from "@vanilla-extract/css";

export const root = style({
  marginTop: "0.9rem",
  display: "flex",
  alignItems: "flex-start",
  gap: "0.55rem",
  color: "var(--colors-style-color032)",
  cursor: "pointer",
});

export const checkbox = style({
  appearance: "none",
  WebkitAppearance: "none",
  margin: 0,
  width: "20px",
  height: "20px",
  borderRadius: "7px",
  border: "1px solid var(--colors-checkbox-border)",
  background: "var(--colors-checkbox-background)",
  boxShadow: "0 2px 6px var(--colors-panel-shadow)",
  display: "inline-grid",
  placeItems: "center",
  position: "relative",
  flexShrink: 0,
  cursor: "pointer",
  transition: "background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 120ms ease",
  accentColor: "var(--colors-style-color033)",
  lineHeight: 1,
  selectors: {
    '&::after': {
      content: '""',
      width: "5px",
      height: "10px",
      border: "solid var(--colors-checkbox-check)",
      borderWidth: "0 2px 2px 0",
      transform: "translateY(-0.5px) rotate(45deg) scale(0)",
      transformOrigin: "center",
      transition: "transform 120ms ease",
    },
    '&:hover:not(:disabled)': {
      borderColor: "var(--colors-select-border-hover)",
      boxShadow: "0 3px 9px var(--colors-panel-shadow)",
    },
    '&:active:not(:disabled)': {
      transform: "translateY(0.5px)",
    },
    '&:checked::after': {
      transform: "translateY(-0.5px) rotate(45deg) scale(1)",
    },
    '&:checked': {
      background: "var(--colors-checkbox-checked-background)",
      borderColor: "transparent",
      boxShadow: "0 4px 10px var(--colors-panel-shadow)",
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
