import { globalStyle, style, styleVariants } from "@vanilla-extract/css";

export const panel = style({
  borderRadius: "14px",
  padding: "0.95rem",
  border: "1px solid",
  color: "var(--colors-text-primary)",
});

export const tone = styleVariants({
  info: {
    borderColor: "var(--colors-toast-info-border)",
    background: "var(--colors-toast-info-bg)",
  },
  success: {
    borderColor: "var(--colors-toast-success-border)",
    background: "var(--colors-toast-success-bg)",
  },
  warning: {
    borderColor: "var(--colors-toast-warning-border)",
    background: "var(--colors-toast-warning-bg)",
  },
  error: {
    borderColor: "var(--colors-toast-error-border)",
    background: "var(--colors-toast-error-bg)",
  },
});

export const title = style({
  margin: "0 0 0.4rem",
  fontSize: "0.95rem",
  fontWeight: 750,
  color: "var(--colors-text-primary)",
});

globalStyle(`${panel} p`, {
  margin: "0",
});

globalStyle(`${panel} p + p`, {
  marginTop: "0.45rem",
});

globalStyle(`${panel} ul`, {
  margin: "0.55rem 0 0",
  paddingLeft: "1.15rem",
});

globalStyle(`${panel} li + li`, {
  marginTop: "0.22rem",
});

globalStyle(`${panel} code`, {
  color: "var(--colors-text-primary)",
});
