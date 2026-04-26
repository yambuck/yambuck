import { style } from "@vanilla-extract/css";

export const wrap = style({
  textAlign: "center",
  marginBottom: "0.9rem",
});

export const appWrap = style({
  display: "grid",
  gridTemplateColumns: "80px minmax(0, 1fr) auto",
  gap: "0.9rem",
  alignItems: "start",
  marginBottom: "0.9rem",
  '@media': {
    '(max-width: 720px)': {
      gridTemplateColumns: "64px minmax(0, 1fr)",
      gap: "0.7rem",
    },
  },
});

export const icon = style({
  width: "80px",
  height: "80px",
  borderRadius: "16px",
  objectFit: "contain",
  background: "transparent",
  border: 0,
  '@media': {
    '(max-width: 720px)': {
      width: "64px",
      height: "64px",
      borderRadius: "14px",
    },
  },
});

export const appText = style({
  minWidth: 0,
  textAlign: "center",
});

export const actions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  alignSelf: "start",
  '@media': {
    '(max-width: 720px)': {
      gridColumn: "1 / -1",
      justifyContent: "flex-end",
      width: "100%",
    },
  },
});

export const spacer = style({
  width: "80px",
  height: "80px",
  '@media': {
    '(max-width: 720px)': {
      display: "none",
    },
  },
});

export const subtitle = style({
  margin: "0.35rem 0 0",
  color: "var(--colors-subtitle-text)",
});
