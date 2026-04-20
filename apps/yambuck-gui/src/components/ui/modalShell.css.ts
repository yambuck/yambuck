import { style } from "@vanilla-extract/css";

export const overlay = style({
  position: "absolute",
  inset: 0,
  zIndex: 28,
  background: "var(--colors-style-color086)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
});

export const card = style({
  ["--panel-radius" as string]: "18px",
  ["--panel-close-size" as string]: "34px",
  width: "min(var(--layout-primary-panel-max-width), 100%)",
  borderRadius: "18px",
  border: "1px solid var(--colors-style-color087)",
  background: "linear-gradient(160deg, var(--colors-style-color088), var(--colors-style-color089))",
  boxShadow: "0 25px 50px var(--colors-style-color090)",
  padding: "1rem",
  position: "relative",
  maxHeight: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "visible",
});

export const body = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  display: "grid",
  gap: "0.75rem",
});
