import { style } from "@vanilla-extract/css";

export const closeButton = style({
  position: "absolute",
  top: "calc(var(--panel-radius) - (var(--panel-radius) / 1.41421356) - (var(--panel-close-size) / 2))",
  right: "calc(var(--panel-radius) - (var(--panel-radius) / 1.41421356) - (var(--panel-close-size) / 2))",
  transform: "none",
  zIndex: 3,
  width: "var(--panel-close-size)",
  height: "var(--panel-close-size)",
  borderRadius: "999px",
  border: "1px solid var(--colors-style-color006)",
  background: "var(--colors-style-color007)",
  color: "var(--colors-style-color008)",
  fontSize: "1.25rem",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  '@media': {
    '(max-width: 720px)': {
      ["--panel-close-size" as string]: "34px",
    },
  },
  selectors: {
    '&:hover': {
      background: "var(--colors-style-color009)",
    },
  },
});
