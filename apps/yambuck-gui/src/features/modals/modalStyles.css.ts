import { globalStyle, style } from "@vanilla-extract/css";

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.72rem",
});

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.6rem",
  flexWrap: "wrap",
  color: "var(--colors-style-color076)",
  fontSize: "0.86rem",
});

export const toolbarLabel = style({
  minWidth: 0,
  overflowWrap: "anywhere",
});

export const updateActions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  '@media': {
    '(max-width: 720px)': {
      width: "100%",
      flexWrap: "wrap",
    },
  },
});

export const licenseCard = style({
  height: "100%",
});

export const licenseText = style({
  margin: "0.2rem 0 0",
  minHeight: 0,
  flex: 1,
  overflow: "auto",
  borderRadius: "12px",
  border: 0,
  background: "var(--colors-style-color015)",
  boxShadow: "0 8px 18px var(--colors-panel-shadow)",
  padding: "0.85rem",
  color: "var(--colors-style-color093)",
  lineHeight: 1.4,
  whiteSpace: "pre-wrap",
  fontFamily: '"Fira Mono", "JetBrains Mono", monospace',
  fontSize: "0.84rem",
});

export const screenshotOverlay = style({
  zIndex: 24,
  padding: "0.9rem",
});

export const screenshotCard = style({
  height: "100%",
  padding: "0.75rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.65rem",
  '@media': {
    '(max-width: 720px)': {
      width: "100%",
      height: "calc(100vh - 92px)",
      padding: "0.6rem",
    },
  },
});

globalStyle(`${screenshotCard} .modal-shell-body`, {
  flex: 1,
  minHeight: 0,
  display: "flex",
});

globalStyle(`${screenshotCard} .modal-shell-content`, {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
});

globalStyle(`${screenshotCard} .modal-section`, {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
});

export const screenshotImage = style({
  flex: 1,
  width: "100%",
  minHeight: 0,
  objectFit: "contain",
  borderRadius: "10px",
  background: "var(--colors-style-color095)",
});

export const screenshotControls = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.5rem",
});

export const installedReviewCard = style({
  maxHeight: "100%",
  overflow: "visible",
});

export const installedReviewOverview = style({
  marginTop: "0.2rem",
});

export const installedReviewLongDescription = style({
  marginBottom: "0.2rem",
});
