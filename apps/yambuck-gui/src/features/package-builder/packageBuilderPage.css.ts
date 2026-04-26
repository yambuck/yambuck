import { style } from "@vanilla-extract/css";

export const pagePanel = style({
  display: "grid",
  gap: "0.85rem",
});

export const startCard = style({
  borderTop: "1px solid var(--colors-style-color068)",
  paddingTop: "0.85rem",
  display: "grid",
  gap: "0.65rem",
});

export const startActions = style({
  display: "flex",
  gap: "0.6rem",
  flexWrap: "wrap",
});

export const actionBar = style({
  display: "flex",
  gap: "0.6rem",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
});

export const statusBadge = style({
  border: "1px solid var(--colors-style-color073)",
  borderRadius: "999px",
  background: "var(--colors-style-color072)",
  color: "var(--colors-style-color074)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "0.2rem 0.55rem",
});

export const workspace = style({
  display: "grid",
  gridTemplateColumns: "190px minmax(0, 1fr) minmax(0, 1fr)",
  gap: "0.75rem",
  borderTop: "1px solid var(--colors-style-color068)",
  paddingTop: "0.9rem",
  '@media': {
    '(max-width: 1180px)': {
      gridTemplateColumns: "190px minmax(0, 1fr)",
      gridTemplateRows: "auto auto",
    },
    '(max-width: 860px)': {
      gridTemplateColumns: "1fr",
    },
  },
});

export const stepList = style({
  display: "grid",
  gap: "0.35rem",
  alignContent: "start",
});

export const stepButton = style({
  border: "1px solid var(--colors-control-border)",
  background: "var(--colors-control-background)",
  color: "var(--colors-control-text)",
  borderRadius: "10px",
  textAlign: "left",
  padding: "0.55rem 0.65rem",
  cursor: "pointer",
  fontSize: "0.84rem",
  fontWeight: 600,
  transition: "background-color 140ms ease, border-color 140ms ease",
  selectors: {
    '&:hover': {
      background: "var(--colors-control-hover-background)",
      borderColor: "var(--colors-select-border-hover)",
    },
  },
});

export const stepButtonActive = style({
  background: "linear-gradient(135deg, var(--colors-style-color077), var(--colors-style-color078))",
  borderColor: "var(--colors-style-color079)",
  color: "var(--colors-style-color080)",
});

export const editorCard = style({
  border: "1px solid var(--colors-style-color075)",
  borderRadius: "12px",
  background: "var(--colors-style-color005)",
  padding: "0.8rem",
  minWidth: 0,
});

export const fieldGrid = style({
  display: "grid",
  gap: "0.6rem",
  minWidth: 0,
});

export const fieldStack = style({
  display: "grid",
  gap: "0.35rem",
});

export const fieldLabel = style({
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--colors-style-color017)",
});

export const field = style({
  color: "var(--colors-style-color046)",
  margin: 0,
});

export const sectionBody = style({
  margin: 0,
  color: "var(--colors-style-color070)",
});

export const previewCard = style({
  border: "1px solid var(--colors-style-color075)",
  borderRadius: "12px",
  background: "var(--colors-style-color005)",
  padding: "0.8rem",
  minWidth: 0,
  '@media': {
    '(max-width: 1180px)': {
      gridColumn: "1 / -1",
    },
  },
});

export const previewTitle = style({
  margin: 0,
  fontSize: "0.84rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--colors-style-color017)",
});

export const previewCode = style({
  margin: "0.55rem 0 0",
  padding: "0.7rem",
  borderRadius: "10px",
  border: "1px solid var(--colors-style-color073)",
  background: "var(--colors-style-color072)",
  color: "var(--colors-style-color074)",
  fontSize: "0.75rem",
  lineHeight: 1.45,
  maxHeight: "560px",
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

export const importCard = style({
  borderTop: "1px solid var(--colors-style-color068)",
  paddingTop: "0.85rem",
  display: "grid",
  gap: "0.65rem",
});

export const importTextarea = style({
  width: "100%",
  minHeight: "180px",
  borderRadius: "10px",
  border: "1px solid var(--colors-style-color075)",
  background: "var(--colors-style-color005)",
  color: "var(--colors-style-color076)",
  padding: "0.65rem 0.7rem",
  font: "inherit",
  resize: "vertical",
  outline: "none",
  selectors: {
    '&:focus': {
      borderColor: "var(--colors-select-border-hover)",
      boxShadow: "0 0 0 3px var(--colors-select-focus-ring)",
    },
  },
});

export const importActions = style({
  display: "flex",
  gap: "0.6rem",
  justifyContent: "flex-end",
  flexWrap: "wrap",
});

export const hiddenFileInput = style({
  display: "none",
});

export const stagedAssetsCard = style({
  borderTop: "1px solid var(--colors-style-color068)",
  paddingTop: "0.85rem",
  display: "grid",
  gap: "0.55rem",
});

export const stagedAssetList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "grid",
  gap: "0.45rem",
});

export const stagedAssetItem = style({
  border: "1px solid var(--colors-style-color075)",
  borderRadius: "10px",
  background: "var(--colors-style-color005)",
  padding: "0.55rem 0.65rem",
  display: "grid",
  gap: "0.35rem",
});

export const stagedAssetMeta = style({
  display: "flex",
  gap: "0.5rem",
  flexWrap: "wrap",
  fontSize: "0.78rem",
  color: "var(--colors-style-color070)",
  alignItems: "baseline",
});

export const stagedAssetPath = style({
  display: "block",
  borderRadius: "8px",
  border: "1px solid var(--colors-style-color073)",
  background: "var(--colors-style-color072)",
  color: "var(--colors-style-color074)",
  padding: "0.38rem 0.45rem",
  fontSize: "0.74rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});
