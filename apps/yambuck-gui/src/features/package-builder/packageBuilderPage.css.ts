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

export const wipBanner = style({
  border: "1px solid var(--colors-style-color075)",
  borderRadius: "12px",
  background: "var(--colors-style-color005)",
  padding: "0.75rem",
  display: "grid",
  gap: "0.35rem",
});

export const workspace = style({
  display: "grid",
  gap: "0.7rem",
  borderTop: "1px solid var(--colors-style-color068)",
  paddingTop: "0.9rem",
});

export const stepList = style({
  display: "flex",
  gap: "0.5rem",
  alignItems: "stretch",
  flexWrap: "wrap",
});

export const stepButton = style({
  border: "1px solid var(--colors-control-border)",
  background: "var(--colors-control-background)",
  color: "var(--colors-control-text)",
  borderRadius: "999px",
  textAlign: "left",
  padding: "0.4rem 0.55rem",
  cursor: "pointer",
  fontSize: "0.78rem",
  fontWeight: 600,
  flex: "1 1 160px",
  minWidth: 0,
  transition: "background-color 140ms ease, border-color 140ms ease",
  selectors: {
    '&:hover': {
      background: "var(--colors-control-hover-background)",
      borderColor: "var(--colors-select-border-hover)",
    },
  },
});

export const stepButtonContent = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.4rem",
});

export const stepButtonLabel = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  minWidth: 0,
});

export const stepNumber = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.2rem",
  height: "1.2rem",
  borderRadius: "999px",
  border: "1px solid var(--colors-style-color073)",
  fontSize: "0.68rem",
  fontWeight: 700,
  flexShrink: 0,
});

export const stepStatusBadge = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  border: "1px solid var(--colors-style-color073)",
  padding: "0.08rem 0.42rem",
  fontSize: "0.66rem",
  fontWeight: 700,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  width: "fit-content",
});

export const stepStatusOk = style({
  background: "var(--colors-style-color005)",
  color: "var(--colors-style-color070)",
});

export const stepStatusAttention = style({
  background: "var(--colors-style-color072)",
  color: "var(--colors-style-color074)",
  borderColor: "var(--colors-style-color079)",
});

export const stepButtonActive = style({
  background: "linear-gradient(135deg, var(--colors-style-color077), var(--colors-style-color078))",
  borderColor: "var(--colors-style-color079)",
  color: "var(--colors-style-color080)",
});

export const targetListActions = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.55rem",
  flexWrap: "wrap",
});

export const targetList = style({
  display: "grid",
  gap: "0.45rem",
});

export const targetCard = style({
  border: "1px solid var(--colors-style-color075)",
  borderRadius: "10px",
  background: "var(--colors-style-color005)",
  padding: "0.5rem",
  display: "grid",
  gap: "0.55rem",
});

export const targetCardHeader = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "0.45rem",
  alignItems: "center",
});

export const targetCardBody = style({
  display: "grid",
  gap: "0.55rem",
});

export const targetSummary = style({
  display: "block",
});

export const targetSummaryMeta = style({
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 500,
  color: "var(--colors-style-color070)",
  marginTop: "0.15rem",
});

export const targetSummaryMatch = style({
  display: "block",
  fontSize: "0.7rem",
  color: "var(--colors-style-color017)",
  marginTop: "0.12rem",
});

export const targetDuplicateWarning = style({
  border: "1px solid var(--colors-style-color075)",
  background: "var(--colors-style-color072)",
  color: "var(--colors-style-color074)",
  borderRadius: "10px",
  padding: "0.6rem 0.7rem",
  fontSize: "0.8rem",
});

export const targetValidationList = style({
  margin: "0.4rem 0 0",
  paddingLeft: "1rem",
  display: "grid",
  gap: "0.2rem",
});

export const editorCard = style({
  border: "1px solid var(--colors-style-color075)",
  borderRadius: "12px",
  background: "var(--colors-style-color005)",
  padding: "0.8rem",
  minWidth: 0,
});

export const wizardFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "0.55rem",
  borderTop: "1px solid var(--colors-style-color068)",
  paddingTop: "0.75rem",
  marginTop: "0.75rem",
  flexWrap: "wrap",
});

export const wizardFooterActions = style({
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  flexWrap: "wrap",
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

export const fieldLabelRow = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
});

export const fieldHelp = style({
  width: "1rem",
  height: "1rem",
  borderRadius: "999px",
  border: "1px solid var(--colors-style-color073)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.67rem",
  fontWeight: 700,
  color: "var(--colors-style-color070)",
  cursor: "help",
});

export const fieldControlRow = style({
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  '@media': {
    '(max-width: 720px)': {
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
});

export const field = style({
  color: "var(--colors-style-color046)",
  margin: 0,
});

export const sectionBody = style({
  margin: 0,
  color: "var(--colors-style-color070)",
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

export const manifestModalCard = style({
  width: "min(980px, 100%)",
});

export const manifestModalBody = style({
  display: "grid",
  gap: "0.6rem",
});

export const checklistModalBody = style({
  display: "grid",
  gap: "0.75rem",
});

export const checklistSection = style({
  border: "1px solid var(--colors-style-color075)",
  borderRadius: "10px",
  background: "var(--colors-style-color005)",
  padding: "0.55rem 0.65rem",
  display: "grid",
  gap: "0.4rem",
});

export const checklistSectionHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.4rem",
  fontSize: "0.82rem",
  fontWeight: 700,
});

export const checklistStatus = style({
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "var(--colors-style-color017)",
});

export const checklistList = style({
  margin: 0,
  paddingLeft: "1rem",
  display: "grid",
  gap: "0.2rem",
  fontSize: "0.8rem",
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
