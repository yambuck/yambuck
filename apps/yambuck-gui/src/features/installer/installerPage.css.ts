import { globalStyle, style } from "@vanilla-extract/css";

export const trustBox = style({
  borderRadius: "14px",
  padding: "0.95rem",
  border: "1px solid",
});

export const trustWarning = style({
  borderColor: "var(--colors-style-color034)",
  background: "var(--colors-style-color035)",
});

export const trustVerified = style({
  borderColor: "var(--colors-style-color036)",
  background: "var(--colors-style-color037)",
});

export const trustTitle = style({
  margin: "0 0 0.4rem",
  fontSize: "0.95rem",
  fontWeight: 700,
});

export const scopeGrid = style({
  display: "grid",
  gap: "0.8rem",
  marginTop: "1rem",
});

export const scopeCard = style({
  display: "block",
  borderRadius: "14px",
  border: "1px solid var(--colors-style-color038)",
  padding: "0.8rem",
  background: "var(--colors-style-color039)",
  cursor: "pointer",
  transition: "border-color 120ms ease, transform 120ms ease",
});

export const scopeCardActive = style({
  borderColor: "var(--colors-style-color040)",
  transform: "translateY(-1px)",
});

globalStyle(`${scopeCard} input`, {
  marginRight: "0.5rem",
  accentColor: "var(--colors-style-color033)",
});

globalStyle(`${scopeCard} span`, {
  fontWeight: 600,
});

globalStyle(`${scopeCard} small`, {
  display: "block",
  color: "var(--colors-style-color041)",
  marginTop: "0.25rem",
});

globalStyle(`${scopeCard} input:focus-visible`, {
  outline: "none",
  boxShadow: "0 0 0 3px var(--colors-focus-ring)",
});

export const progressShell = style({
  marginTop: "1rem",
  width: "100%",
  height: "14px",
  borderRadius: "999px",
  background: "var(--colors-style-color042)",
  border: "1px solid var(--colors-style-color043)",
  overflow: "hidden",
});

export const progressBar = style({
  height: "100%",
  background: "linear-gradient(90deg, var(--colors-style-color044), var(--colors-style-color045))",
  transition: "width 180ms linear",
});

export const progressValue = style({
  margin: "0.55rem 0 0",
  color: "var(--colors-style-color046)",
});

export const openPackageErrorSection = style({
  marginTop: "1rem",
});

export const openPackageErrorBoxText = style({
  margin: "0 0 0.45rem",
  color: "var(--colors-style-color010)",
});

export const openPackageErrorPre = style({
  margin: "0.75rem 0 0",
  maxHeight: "240px",
  overflow: "auto",
  borderRadius: "10px",
  border: "1px solid var(--colors-style-color011)",
  background: "var(--colors-style-color012)",
  padding: "0.7rem",
  color: "var(--colors-style-color013)",
  lineHeight: 1.38,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  fontFamily: '"Fira Mono", "JetBrains Mono", monospace',
  fontSize: "0.82rem",
});
