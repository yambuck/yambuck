import { style } from "@vanilla-extract/css";

export const input = style({
  width: "100%",
  height: "36px",
  minHeight: "36px",
  borderRadius: "var(--radius-control)",
  border: "1px solid var(--colors-select-border)",
  background: "var(--colors-select-background)",
  color: "var(--colors-select-text)",
  padding: "0.45rem 0.62rem",
  font: "inherit",
  fontSize: "0.88rem",
  lineHeight: 1.2,
  appearance: "none",
  WebkitAppearance: "none",
  selectors: {
    '&::-webkit-search-decoration': {
      WebkitAppearance: "none",
    },
    '&::-webkit-search-cancel-button': {
      WebkitAppearance: "none",
    },
    '&::placeholder': {
      color: "var(--colors-select-placeholder)",
    },
    '&:focus-visible': {
      outline: "none",
      borderColor: "var(--colors-select-border-hover)",
      boxShadow: "0 0 0 3px var(--colors-select-focus-ring)",
    },
  },
});
