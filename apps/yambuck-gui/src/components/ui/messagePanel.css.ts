import { globalStyle, style, styleVariants } from "@vanilla-extract/css";

export const panel = style({
  borderRadius: "14px",
  padding: "0.95rem",
  border: 0,
  boxShadow: "0 14px 28px var(--colors-toast-shadow)",
});

export const tone = styleVariants({
  info: {
    borderColor: "var(--colors-feedback-info-border)",
    background: "var(--colors-feedback-info-bg)",
    color: "var(--colors-feedback-info-text)",
  },
  success: {
    borderColor: "var(--colors-feedback-success-border)",
    background: "var(--colors-feedback-success-bg)",
    color: "var(--colors-feedback-success-text)",
  },
  warning: {
    borderColor: "var(--colors-feedback-warning-border)",
    background: "var(--colors-feedback-warning-bg)",
    color: "var(--colors-feedback-warning-text)",
  },
  error: {
    borderColor: "var(--colors-feedback-error-border)",
    background: "var(--colors-feedback-error-bg)",
    color: "var(--colors-feedback-error-text)",
  },
});

export const title = style({
  margin: "0 0 0.4rem",
  fontSize: "0.95rem",
  fontWeight: 750,
  color: "inherit",
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
  color: "inherit",
});
