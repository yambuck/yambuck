import { globalStyle, style, styleVariants } from "@vanilla-extract/css";

export const panel = style({
  borderRadius: "14px",
  padding: "0.85rem 0.9rem",
  border: "1px solid var(--feedback-accent)",
  background: "var(--colors-feedback-surface-bg)",
  color: "var(--colors-feedback-body-text)",
  boxShadow: "0 12px 24px var(--colors-toast-shadow)",
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignItems: "center",
  gap: "0.72rem",
});

export const tone = styleVariants({
  info: {
    vars: {
      ["--feedback-accent" as string]: "var(--colors-feedback-info-accent)",
      ["--feedback-icon-bg" as string]: "var(--colors-feedback-info-icon-bg)",
      ["--feedback-icon-color" as string]: "var(--colors-feedback-info-icon-color)",
    },
  },
  success: {
    vars: {
      ["--feedback-accent" as string]: "var(--colors-feedback-success-accent)",
      ["--feedback-icon-bg" as string]: "var(--colors-feedback-success-icon-bg)",
      ["--feedback-icon-color" as string]: "var(--colors-feedback-success-icon-color)",
    },
  },
  warning: {
    vars: {
      ["--feedback-accent" as string]: "var(--colors-feedback-warning-accent)",
      ["--feedback-icon-bg" as string]: "var(--colors-feedback-warning-icon-bg)",
      ["--feedback-icon-color" as string]: "var(--colors-feedback-warning-icon-color)",
    },
  },
  error: {
    vars: {
      ["--feedback-accent" as string]: "var(--colors-feedback-error-accent)",
      ["--feedback-icon-bg" as string]: "var(--colors-feedback-error-icon-bg)",
      ["--feedback-icon-color" as string]: "var(--colors-feedback-error-icon-color)",
    },
  },
});

export const iconWrap = style({
  width: "1.9rem",
  height: "1.9rem",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--feedback-icon-bg)",
  color: "var(--feedback-icon-color)",
  flexShrink: 0,
});

export const title = style({
  margin: "0 0 0.4rem",
  fontSize: "0.95rem",
  fontWeight: 750,
  color: "var(--colors-feedback-title-text)",
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
  color: "var(--colors-feedback-title-text)",
});
