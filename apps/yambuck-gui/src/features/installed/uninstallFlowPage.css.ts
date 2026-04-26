import { style } from "@vanilla-extract/css";

export const uninstallPanel = style({
  display: "flex",
  flexDirection: "column",
});

export const uninstallStepSection = style({
  marginTop: "0.9rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.72rem",
});

export const uninstallActions = style({
  marginTop: "0.5rem",
});

export const uninstallWarningTitle = style({
  margin: "0.2rem 0 0",
  color: "var(--colors-subtitle-text)",
});
