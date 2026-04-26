import { style } from "@vanilla-extract/css";

export const field = style({
  position: "relative",
  selectors: {
    '&[data-copyable="true"]': {
      cursor: "copy",
    },
    '&[data-copyable="true"]:hover': {
      borderColor: "var(--colors-style-color022)",
      background: "var(--colors-style-color023)",
    },
  },
});

export const term = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  outline: "none",
  selectors: {
    '&:focus-visible': {
      boxShadow: "0 0 0 2px var(--colors-style-color029)",
      borderRadius: "8px",
    },
  },
});

export const help = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "0.95rem",
  height: "0.95rem",
  borderRadius: "999px",
  border: "1px solid var(--colors-style-color025)",
  color: "var(--colors-style-color026)",
  fontSize: "0.62rem",
  lineHeight: 1,
});

export const tooltip = style({
  position: "absolute",
  left: 0,
  top: "calc(100% + 0.45rem)",
  minWidth: "220px",
  maxWidth: "320px",
  padding: "0.45rem 0.55rem",
  borderRadius: "8px",
  border: "1px solid var(--colors-style-color027)",
  background: "var(--colors-style-color028)",
  color: "var(--colors-toast-info-text)",
  fontSize: "0.73rem",
  letterSpacing: "normal",
  textTransform: "none",
  lineHeight: 1.35,
  zIndex: 4,
  opacity: 0,
  pointerEvents: "none",
  transform: "translateY(-2px)",
  transition: "opacity 120ms ease, transform 120ms ease",
  selectors: {
    [`${term}:hover &`]: {
      opacity: 1,
      transform: "translateY(0)",
    },
    [`${term}:focus-visible &`]: {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
});

export const dtText = style({
  margin: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.45rem",
  color: "var(--colors-style-color024)",
  fontSize: "0.77rem",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
});

export const copyAffordance = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  background: "transparent",
  color: "var(--colors-style-color071)",
  lineHeight: 1,
  padding: "0.1rem",
  minWidth: "1.2rem",
  minHeight: "1.2rem",
  pointerEvents: "none",
  opacity: 0.72,
  transition: "opacity 120ms ease, color 120ms ease, transform 120ms ease",
  selectors: {
    [`${field}[data-copyable=\"true\"]:hover &`]: {
      opacity: 1,
      color: "var(--colors-feedback-title-text)",
      transform: "translateY(-0.5px)",
    },
    '&[data-state="copied"]': {
      color: "var(--colors-feedback-success-icon-color)",
      opacity: 1,
    },
  },
});

export const ddText = style({
  margin: "0.25rem 0 0",
  fontSize: "0.95rem",
  wordBreak: "break-word",
});

export const link = style({
  color: "var(--colors-style-color030)",
  textDecoration: "none",
  selectors: {
    '&:hover': {
      color: "var(--colors-style-color031)",
      textDecoration: "underline",
    },
  },
});

export const inlineActions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.45rem",
  flexWrap: "wrap",
});

export const licenseActions = style({
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.55rem",
});

export const licenseLabel = style({
  minWidth: 0,
  overflowWrap: "anywhere",
});
