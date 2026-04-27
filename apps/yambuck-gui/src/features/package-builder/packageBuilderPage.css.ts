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
  color: "var(--colors-button-danger-text)",
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

export const targetAddRow = style({
  display: "flex",
  justifyContent: "center",
  paddingTop: "0.3rem",
});

export const targetAddButton = style({
  border: "1px solid var(--colors-style-color073)",
  borderRadius: "999px",
  background: "transparent",
  color: "var(--colors-control-text)",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.45rem",
  padding: "0.22rem 0.55rem 0.22rem 0.22rem",
  cursor: "pointer",
  selectors: {
    '&:hover': {
      borderColor: "var(--colors-select-border-hover)",
      background: "var(--colors-control-hover-background)",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
  },
});

export const targetCard = style({
  borderBottom: "1px solid var(--colors-style-color068)",
  padding: "0.45rem 0",
  display: "grid",
  gap: "0.45rem",
});

export const targetCardHeader = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.45rem",
  flexWrap: "wrap",
});

export const targetCardBody = style({
  display: "grid",
  gap: "0.55rem",
  padding: "0.45rem 0.1rem 0.25rem",
});

export const targetSummary = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  fontWeight: 700,
});

export const targetSummaryMeta = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  fontSize: "0.72rem",
  fontWeight: 500,
  color: "var(--colors-style-color070)",
});

export const targetSummaryMatch = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  border: "1px solid var(--colors-style-color073)",
  padding: "0.08rem 0.45rem",
  fontSize: "0.7rem",
  color: "var(--colors-style-color017)",
});

export const targetSummaryButton = style({
  border: 0,
  padding: 0,
  margin: 0,
  background: "transparent",
  color: "inherit",
  display: "grid",
  gap: "0.2rem",
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
  selectors: {
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
      borderRadius: "8px",
    },
  },
});

export const targetSummaryTop = style({
  display: "flex",
  alignItems: "center",
  gap: "0.35rem",
  flexWrap: "wrap",
});

export const targetSummaryDetails = style({
  display: "flex",
  alignItems: "center",
  gap: "0.45rem",
  flexWrap: "wrap",
});

export const targetHeaderActions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.45rem",
  flexWrap: "wrap",
});

export const targetStatusReady = style({
  borderColor: "var(--colors-feedback-success-accent)",
  color: "var(--colors-feedback-success-accent)",
  background: "color-mix(in srgb, var(--colors-feedback-success-accent) 16%, transparent)",
});

export const targetStatusMissing = style({
  borderColor: "var(--colors-style-color079)",
  color: "var(--colors-style-color074)",
  background: "var(--colors-style-color072)",
});

export const targetBinaryHint = style({
  fontSize: "0.75rem",
  color: "var(--colors-style-color070)",
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

export const compactFieldStack = style({
  width: "min(320px, 100%)",
});

export const assetSection = style({
  selectors: {
    '& + &': {
      marginTop: "0.6rem",
    },
  },
});

export const compactCheckbox = style({
  marginTop: 0,
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

export const inlineActionButton = style({
  justifySelf: "start",
  '@media': {
    '(max-width: 720px)': {
      width: "fit-content",
      alignSelf: "start",
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

export const stepIssuePanel = style({
  border: "1px solid var(--colors-style-color079)",
  background: "var(--colors-style-color072)",
  color: "var(--colors-style-color074)",
  borderRadius: "10px",
  padding: "0.55rem 0.7rem",
  display: "grid",
  gap: "0.35rem",
});

export const stepIssueList = style({
  margin: 0,
  paddingLeft: "1rem",
  display: "grid",
  gap: "0.2rem",
});

export const fieldInvalid = style({
  borderColor: "var(--colors-style-color079)",
  boxShadow: "0 0 0 3px color-mix(in srgb, var(--colors-style-color079) 28%, transparent)",
});

export const fieldStackInvalid = style({
  borderRadius: "10px",
  padding: "0.35rem 0.45rem",
  background: "color-mix(in srgb, var(--colors-style-color072) 55%, transparent)",
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

export const descriptionTextarea = style([
  importTextarea,
  {
    minHeight: "84px",
  },
]);

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

export const assetActionRow = style({
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  flexWrap: "wrap",
});

export const assetThumbGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "0.55rem",
});

export const assetThumbGridCompact = style({
  display: "grid",
  gridTemplateColumns: "150px",
  gap: "0.55rem",
  justifyContent: "start",
});

export const assetThumbTileCompact = style({
  width: "150px",
  minHeight: "150px",
  maxHeight: "150px",
});

export const assetThumbTile = style({
  position: "relative",
  borderRadius: "12px",
  background: "var(--colors-style-color015)",
  boxShadow: "0 8px 18px var(--colors-panel-shadow)",
  overflow: "hidden",
  minHeight: "120px",
});

export const assetThumbImage = style({
  display: "block",
  width: "100%",
  height: "100%",
  maxHeight: "220px",
  objectFit: "cover",
});

export const assetThumbPlaceholder = style({
  minHeight: "120px",
  display: "grid",
  placeItems: "center",
  gap: "0.25rem",
  textAlign: "center",
  color: "var(--colors-style-color070)",
});

export const assetThumbSlotText = style({
  fontSize: "0.72rem",
  color: "var(--colors-style-color070)",
});

export const assetThumbAdd = style({
  position: "absolute",
  inset: "0",
  border: 0,
  background: "transparent",
  color: "var(--colors-feedback-success-accent)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  selectors: {
    '&:hover': {
      background: "color-mix(in srgb, var(--colors-style-color072) 40%, transparent)",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
  },
});

export const assetThumbOpen = style({
  position: "absolute",
  inset: "0",
  border: 0,
  background: "transparent",
  color: "inherit",
  padding: 0,
  cursor: "pointer",
  selectors: {
    '&:hover': {
      background: "color-mix(in srgb, var(--colors-style-color072) 30%, transparent)",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
  },
});

export const assetThumbAddIcon = style({
  width: "2rem",
  height: "2rem",
  borderRadius: "999px",
  background: "var(--colors-feedback-success-accent)",
  color: "var(--colors-style-color080)",
  border: "1px solid var(--colors-feedback-success-accent)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 6px 12px var(--colors-panel-shadow)",
});

export const assetThumbDocIcon = style({
  width: "auto",
  height: "auto",
  color: "var(--colors-style-color070)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

export const assetThumbRemove = style({
  position: "absolute",
  top: "0.35rem",
  right: "0.35rem",
  width: "1.45rem",
  height: "1.45rem",
  border: "1px solid color-mix(in srgb, var(--colors-feedback-error-accent) 88%, black)",
  borderRadius: "999px",
  background: "color-mix(in srgb, var(--colors-feedback-error-accent) 88%, black)",
  color: "var(--colors-button-danger-text)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  selectors: {
    '&:hover': {
      background: "var(--colors-feedback-error-accent)",
    },
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-focus-ring)",
    },
  },
});
