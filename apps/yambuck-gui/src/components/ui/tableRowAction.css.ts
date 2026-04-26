import { style } from "@vanilla-extract/css";

export const actionButton = style({
  color: "var(--colors-style-color071)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "2.9rem",
  height: "2.9rem",
  pointerEvents: "none",
  transition: "color 140ms ease, transform 140ms ease",
  selectors: {
    '.installed-table tbody tr:hover &': {
      color: "var(--colors-feedback-title-text)",
      transform: "translateX(1px)",
    },
  },
});
