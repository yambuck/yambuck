import { style } from "@vanilla-extract/css";

export const shell = style({
  width: "100%",
  height: "14px",
  borderRadius: "999px",
  background: "var(--colors-style-color042)",
  border: "1px solid var(--colors-style-color043)",
  overflow: "hidden",
});

export const bar = style({
  height: "100%",
  background: "linear-gradient(90deg, var(--colors-style-color044), var(--colors-style-color045))",
  transition: "width 180ms linear",
});

export const valueText = style({
  margin: "0.55rem 0 0",
  color: "var(--colors-style-color046)",
});
