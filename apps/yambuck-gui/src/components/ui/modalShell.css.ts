import { style } from "@vanilla-extract/css";

export const overlay = style({
  position: "absolute",
  inset: 0,
  zIndex: 40,
  background: "var(--colors-style-color086)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "var(--layout-page-gutter-y-top, 1.1rem) var(--layout-page-gutter-x, 1rem) var(--layout-page-gutter-y-bottom, 1rem)",
  overflow: "auto",
  pointerEvents: "auto",
  '@media': {
    '(max-width: 720px)': {
      padding: "0.9rem 0.75rem 0.8rem",
    },
  },
});

export const card = style({
  ["--panel-radius" as string]: "var(--radius-panel)",
  ["--panel-close-size" as string]: "36px",
  width: "min(var(--layout-primary-panel-max-width), 100%)",
  borderRadius: "var(--radius-panel)",
  border: "1px solid var(--colors-panel-border)",
  background: "var(--colors-panel-background)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 22px 45px var(--colors-panel-shadow), 0 8px 22px var(--colors-panel-shadow-accent)",
  padding: 0,
  position: "relative",
  maxHeight: "calc(100% - var(--layout-page-gutter-y-top, 1.1rem) - var(--layout-page-gutter-y-bottom, 1rem))",
  display: "flex",
  flexDirection: "column",
  overflow: "visible",
  marginTop: 0,
  marginBottom: 0,
  '@media': {
    '(max-width: 720px)': {
      maxHeight: "calc(100% - 1.7rem)",
    },
  },
});

export const body = style({
  flex: 1,
  minHeight: 0,
  overflow: "auto",
});

export const content = style({
  flex: 1,
  minHeight: "100%",
  padding: "1rem",
  display: "grid",
  gap: "0.75rem",
});
