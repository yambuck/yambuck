import { globalStyle, style } from "@vanilla-extract/css";

export const group = style({
  margin: 0,
  padding: 0,
  border: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.65rem",
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

export const optionsTrack = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  width: "min(30rem, 100%)",
  margin: "0 auto",
  borderRadius: "var(--radius-pill)",
  border: "1px solid var(--colors-style-color038)",
  background: "var(--colors-style-color039)",
  padding: "4px",
  boxShadow: "0 10px 22px var(--colors-panel-shadow)",
});

export const slider = style({
  position: "absolute",
  top: "4px",
  left: "4px",
  bottom: "4px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, var(--colors-style-color077), var(--colors-style-color078))",
  boxShadow: "0 8px 18px var(--colors-panel-shadow)",
  transition: "transform 180ms ease",
  pointerEvents: "none",
  zIndex: 1,
});

export const option = style({
  position: "relative",
  zIndex: 2,
  minHeight: "46px",
  borderRadius: "999px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "0.4rem 0.8rem",
  color: "var(--colors-style-color076)",
  fontSize: "0.82rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  transition: "color 160ms ease",
});

export const optionActive = style({
  color: "var(--colors-style-color080)",
});

export const optionInput = style({
  position: "absolute",
  opacity: 0,
  width: "1px",
  height: "1px",
  pointerEvents: "none",
});

globalStyle(`${option} span`, {
  pointerEvents: "none",
});

export const description = style({
  margin: 0,
  textAlign: "center",
  color: "var(--colors-style-color041)",
  fontSize: "0.84rem",
  lineHeight: 1.35,
});

globalStyle(`${option} input:focus-visible + span`, {
  outline: "none",
  boxShadow: "0 0 0 3px var(--colors-focus-ring)",
  borderRadius: "999px",
});
