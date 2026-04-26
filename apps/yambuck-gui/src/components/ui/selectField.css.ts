import { style } from "@vanilla-extract/css";

export const root = style({
  position: "relative",
  display: "flex",
  width: "100%",
  selectors: {
    '&::after': {
      content: "",
      position: "absolute",
      right: "0.72rem",
      top: "50%",
      width: "0.45rem",
      height: "0.45rem",
      borderRight: "2px solid var(--colors-select-chevron)",
      borderBottom: "2px solid var(--colors-select-chevron)",
      transform: "translateY(-65%) rotate(45deg)",
      pointerEvents: "none",
    },
  },
});

export const control = style({
  height: "36px",
  minHeight: "36px",
  width: "100%",
  borderRadius: "10px",
  border: "1px solid var(--colors-select-border)",
  background: "var(--colors-select-background)",
  color: "var(--colors-select-text)",
  padding: "0.45rem 2rem 0.45rem 0.62rem",
  font: "inherit",
  fontSize: "0.88rem",
  lineHeight: 1.2,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  textAlign: "left",
  cursor: "pointer",
  selectors: {
    '&:hover': {
      borderColor: "var(--colors-select-border-hover)",
    },
    '&:focus-visible': {
      outline: "none",
      borderColor: "var(--colors-select-border-hover)",
      boxShadow: "0 0 0 3px var(--colors-select-focus-ring)",
    },
    '&:disabled': {
      background: "var(--colors-select-disabled-background)",
      color: "var(--colors-select-disabled-text)",
      cursor: "not-allowed",
    },
  },
});

export const label = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const placeholderLabel = style({
  color: "var(--colors-select-placeholder)",
});

export const menu = style({
  position: "absolute",
  top: "calc(100% + 0.3rem)",
  left: 0,
  right: 0,
  minWidth: "100%",
  zIndex: 14,
  display: "grid",
  gap: "0.2rem",
  maxHeight: "220px",
  overflow: "auto",
  padding: "0.35rem",
  borderRadius: "10px",
  border: "1px solid var(--colors-select-border-hover)",
  background: "var(--colors-select-menu-background)",
  boxShadow: "0 14px 26px var(--colors-panel-shadow)",
  wordBreak: "normal",
  overflowWrap: "normal",
});

export const option = style({
  display: "block",
  width: "100%",
  border: 0,
  borderRadius: "8px",
  background: "transparent",
  color: "var(--colors-select-menu-text)",
  fontSize: "0.86rem",
  textAlign: "left",
  padding: "0.42rem 0.52rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  wordBreak: "normal",
  overflowWrap: "normal",
  selectors: {
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 2px var(--colors-select-focus-ring)",
    },
    '&:disabled': {
      color: "var(--colors-select-disabled-text)",
      cursor: "not-allowed",
    },
  },
});

export const optionHighlighted = style({
  background: "var(--colors-select-background)",
});

export const optionSelected = style({
  background: "var(--colors-style-color005)",
  color: "var(--colors-select-text)",
});
