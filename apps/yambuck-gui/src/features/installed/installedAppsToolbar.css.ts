import { style } from "@vanilla-extract/css";

export const root = style({
  marginTop: "0.85rem",
  display: "grid",
  gridTemplateColumns: "minmax(240px, 1.3fr) repeat(2, minmax(150px, 0.55fr)) auto",
  gap: "0.65rem",
  alignItems: "end",
  '@media': {
    '(max-width: 980px)': {
      gridTemplateColumns: "minmax(0, 1fr) repeat(2, minmax(130px, 0.5fr))",
    },
    '(max-width: 760px)': {
      gridTemplateColumns: "1fr",
    },
  },
});

export const field = style({
  display: "grid",
  gap: "0.3rem",
});

export const fieldLabel = style({
  color: "var(--colors-style-color047)",
  fontSize: "0.74rem",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
});

export const actions = style({
  display: "flex",
  justifyContent: "flex-end",
  '@media': {
    '(max-width: 980px)': {
      gridColumn: "1 / -1",
      justifyContent: "flex-start",
    },
    '(max-width: 760px)': {
      justifyContent: "stretch",
    },
  },
});
