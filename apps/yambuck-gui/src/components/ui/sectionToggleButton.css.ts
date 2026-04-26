import { style } from "@vanilla-extract/css";

export const button = style({
  border: "1px solid var(--colors-style-color018)",
  background: "var(--colors-style-color019)",
  color: "var(--colors-style-color020)",
  borderRadius: "var(--radius-pill)",
  padding: "0.28rem 0.72rem",
  fontSize: "0.74rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
  selectors: {
    '&:hover': {
      background: "var(--colors-style-color021)",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
  },
});
