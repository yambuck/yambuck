import { style } from "@vanilla-extract/css";

export const shell = style({
  borderTop: "1px solid var(--colors-style-color096)",
  background: "linear-gradient(120deg, var(--colors-style-color097), var(--colors-style-color098))",
  padding: "0.55rem 0.75rem 0.65rem",
  display: "grid",
  gap: "0.45rem",
});

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.55rem",
  fontSize: "0.78rem",
  color: "var(--colors-style-color099)",
});

export const title = style({
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 700,
});

export const subtle = style({
  margin: 0,
  color: "var(--colors-style-color070)",
  fontSize: "0.74rem",
});

export const scenarioRow = style({
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  flexWrap: "wrap",
});

export const label = style({
  margin: 0,
  fontSize: "0.76rem",
  color: "var(--colors-style-color099)",
  minWidth: "5.2rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
});

export const scenarioPills = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.45rem",
  flexWrap: "wrap",
});

export const versionRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "0.55rem",
  '@media': {
    '(max-width: 900px)': {
      gridTemplateColumns: "1fr",
    },
  },
});

export const versionField = style({
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr)",
  alignItems: "center",
  gap: "0.45rem",
});

export const versionInput = style({
  minWidth: 0,
  maxWidth: "16rem",
});
