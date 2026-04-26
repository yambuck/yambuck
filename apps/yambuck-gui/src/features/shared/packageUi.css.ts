import { globalStyle, style } from "@vanilla-extract/css";

export const packagePanel = style({
  ["--panel-radius" as string]: "24px",
  ["--panel-close-size" as string]: "36px",
  position: "relative",
  overflow: "visible",
});

export const subtitle = style({
  margin: "0.35rem 0 1rem",
  color: "var(--colors-subtitle-text)",
});

export const packageOverview = style({
  marginTop: "0.7rem",
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "0.8rem",
  alignItems: "start",
  '@media': {
    '(max-width: 720px)': {
      gridTemplateColumns: "1fr",
    },
  },
});

export const detailsHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "0.8rem",
  paddingRight: "2.1rem",
  '@media': {
    '(max-width: 720px)': {
      flexDirection: "column",
      alignItems: "flex-start",
      paddingRight: 0,
    },
  },
});

export const detailsActions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  flexShrink: 0,
  '@media': {
    '(max-width: 720px)': {
      width: "100%",
      justifyContent: "flex-end",
    },
  },
});

export const detailsActionButton = style({
  minWidth: "8.75rem",
  whiteSpace: "nowrap",
});

export const packageIcon = style({
  width: "96px",
  height: "96px",
  borderRadius: "14px",
  border: 0,
  objectFit: "contain",
  background: "transparent",
});

export const packageIconPlaceholder = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px dashed var(--colors-style-color001)",
  background: "var(--colors-style-color002)",
  color: "var(--colors-style-color003)",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
});

export const packageDescription = style({
  marginBottom: "0.45rem",
});

export const screenshotStrip = style({
  marginTop: "0.75rem",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "0.55rem",
  '@media': {
    '(max-width: 720px)': {
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    },
  },
});

export const screenshotTile = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  borderRadius: "12px",
  background: "var(--colors-style-color015)",
  boxShadow: "0 8px 18px var(--colors-panel-shadow)",
  padding: "0.35rem",
  cursor: "zoom-in",
  transition: "background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
  selectors: {
    '&:hover': {
      background: "var(--colors-style-color023)",
      boxShadow: "0 10px 22px var(--colors-panel-shadow)",
      transform: "translateY(-1px)",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-select-focus-ring), 0 10px 22px var(--colors-panel-shadow)",
    },
  },
});

globalStyle(`${screenshotStrip} img`, {
  width: "100%",
  height: "auto",
  maxHeight: "220px",
  aspectRatio: "auto",
  objectFit: "contain",
  borderRadius: "10px",
});

globalStyle(`${screenshotStrip} img`, {
  '@media': {
    '(max-width: 720px)': {
      maxHeight: "260px",
    },
  },
});

export const metaGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "0.9rem",
  margin: "1rem 0 0",
  '@media': {
    '(max-width: 720px)': {
      gridTemplateColumns: "1fr",
    },
  },
});

export const metaGridCompact = style({
  marginTop: "0.35rem",
});

globalStyle(`${metaGrid} > div`, {
  position: "relative",
  borderRadius: "12px",
  border: 0,
  padding: "0.7rem",
  background: "var(--colors-style-color015)",
  boxShadow: "0 8px 18px var(--colors-panel-shadow)",
  transition: "background-color 120ms ease, box-shadow 120ms ease",
});

globalStyle(`${metaGrid} > div:hover`, {
  background: "var(--colors-style-color023)",
  boxShadow: "0 10px 22px var(--colors-panel-shadow)",
});

export const metaSection = style({
  marginTop: "1rem",
});

export const technicalSection = style({
  marginTop: "0.7rem",
});

export const longDescriptionSection = style({
  marginTop: "0.7rem",
});

export const longDescriptionCard = style({
  borderRadius: "12px",
  border: 0,
  padding: "0.8rem",
  background: "var(--colors-style-color015)",
  boxShadow: "0 8px 18px var(--colors-panel-shadow)",
  marginTop: "0.65rem",
});

globalStyle(`${longDescriptionCard} p`, {
  margin: "0.65rem 0 0",
  color: "var(--colors-style-color016)",
  lineHeight: 1.45,
  whiteSpace: "pre-line",
});

export const metaSectionHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.7rem",
  '@media': {
    '(max-width: 720px)': {
      flexDirection: "column",
      alignItems: "flex-start",
    },
  },
});

export const technicalToggleOnly = style({
  justifyContent: "flex-end",
});

globalStyle(`${metaSectionHeader} h2`, {
  fontSize: "0.9rem",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "var(--colors-style-color017)",
});

export const actions = style({
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.6rem",
  rowGap: "0.6rem",
  marginTop: "1.2rem",
  padding: "0.1rem 0",
  '@media': {
    '(max-width: 720px)': {
      justifyContent: "stretch",
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
});

export const actionsCompact = style({
  marginTop: "0.75rem",
});

export const actionsStart = style({
  justifyContent: "flex-start",
});
