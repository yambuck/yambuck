import { style } from "@vanilla-extract/css";

export const panel = style({
  ["--panel-radius" as string]: "var(--radius-panel)",
  ["--panel-close-size" as string]: "36px",
  width: "min(var(--layout-primary-panel-max-width), 100%)",
  margin: "0 auto",
  borderRadius: "var(--radius-panel)",
  border: 0,
  padding: "1.5rem",
  background: "var(--colors-panel-background)",
  boxShadow: "0 22px 45px var(--colors-panel-shadow)",
  animation: "fade-up 220ms ease",
  position: "relative",
  overflow: "visible",
});
