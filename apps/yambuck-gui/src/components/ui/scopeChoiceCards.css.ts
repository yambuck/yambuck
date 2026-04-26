import { globalStyle, style } from "@vanilla-extract/css";

export const group = style({
  margin: 0,
  padding: 0,
  border: 0,
  display: "grid",
  gap: "0.8rem",
});

globalStyle(`${group} legend`, {
  marginBottom: "0.45rem",
  padding: 0,
  color: "var(--colors-style-color047)",
  fontSize: "0.74rem",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
});

export const card = style({
  display: "block",
  borderRadius: "var(--radius-surface)",
  border: "1px solid var(--colors-style-color038)",
  padding: "0.8rem",
  background: "var(--colors-style-color039)",
  cursor: "pointer",
  transition: "border-color 120ms ease, transform 120ms ease",
});

export const cardActive = style({
  borderColor: "var(--colors-style-color040)",
  transform: "translateY(-1px)",
});

globalStyle(`${card} input`, {
  marginRight: "0.5rem",
  accentColor: "var(--colors-style-color033)",
});

globalStyle(`${card} span`, {
  fontWeight: 600,
});

globalStyle(`${card} small`, {
  display: "block",
  color: "var(--colors-style-color041)",
  marginTop: "0.25rem",
});

globalStyle(`${card} input:focus-visible`, {
  outline: "none",
  boxShadow: "0 0 0 3px var(--colors-focus-ring)",
});
