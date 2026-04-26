import { style, styleVariants } from "@vanilla-extract/css";

export const base = style({
  borderRadius: "var(--radius-control)",
  border: "1px solid transparent",
  padding: "0.58rem 0.95rem",
  minHeight: "36px",
  fontSize: "0.93rem",
  fontWeight: 600,
  lineHeight: 1.2,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.35rem",
  cursor: "pointer",
  transition: "background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, filter 140ms ease",
  selectors: {
    '&:disabled': {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
  },
});

export const variant = styleVariants({
  primary: {
    color: "var(--colors-button-primary-text)",
    background: "var(--colors-button-primary-background)",
    selectors: {
      '&:not(:disabled):hover': {
        filter: "brightness(1.04)",
        boxShadow: "0 8px 18px var(--colors-panel-shadow)",
      },
    },
  },
  ghost: {
    color: "var(--colors-button-ghost-text)",
    borderColor: "var(--colors-button-ghost-border)",
    background: "var(--colors-button-ghost-background)",
    selectors: {
      '&:not(:disabled):hover': {
        borderColor: "var(--colors-select-border-hover)",
        background: "var(--colors-control-hover-background)",
      },
    },
  },
  danger: {
    color: "var(--colors-button-danger-text)",
    borderColor: "var(--colors-button-danger-border)",
    background: "var(--colors-button-danger-background)",
    selectors: {
      '&:not(:disabled):hover': {
        background: "var(--colors-button-danger-hover-background)",
        boxShadow: "0 8px 18px var(--colors-panel-shadow)",
      },
    },
  },
});

export const fullWidthOnSmall = style({
  '@media': {
    '(max-width: 720px)': {
      width: "100%",
    },
  },
});

export const ghostLink = style([base, variant.ghost]);
