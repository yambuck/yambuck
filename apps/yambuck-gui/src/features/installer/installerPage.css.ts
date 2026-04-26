import { style } from "@vanilla-extract/css";

export const installerPanel = style({
  display: "flex",
  flexDirection: "column",
});

export const licenseActionRow = style({
  justifyContent: "center",
  '@media': {
    '(max-width: 720px)': {
      justifyContent: "center",
    },
  },
});

export const installerActionRow = style({
  marginTop: "auto",
  paddingTop: "1.2rem",
});

export const scopeChoicesWrap = style({
  marginTop: "1rem",
});

export const progressWrap = style({
  marginTop: "1rem",
});

export const licenseRequirementNote = style({
  margin: "0.55rem 0 0",
  color: "var(--colors-toast-error-text)",
  fontSize: "0.88rem",
});

export const scopeNotice = style({
  marginTop: "0.85rem",
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
