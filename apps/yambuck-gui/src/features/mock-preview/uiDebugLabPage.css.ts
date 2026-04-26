import { style } from "@vanilla-extract/css";

export const stack = style({
  display: "grid",
  gap: "0.95rem",
  marginTop: "0.9rem",
});

export const section = style({
  border: 0,
  borderRadius: "12px",
  padding: "0.8rem",
  background: "var(--colors-style-color069)",
  boxShadow: "0 10px 22px var(--colors-panel-shadow)",
});

export const sectionTitle = style({
  margin: "0 0 0.45rem",
  fontSize: "0.98rem",
});

export const sectionDescription = style({
  margin: "0 0 0.7rem",
  color: "var(--colors-style-color070)",
  fontSize: "0.9rem",
});

export const row = style({
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  flexWrap: "wrap",
});

export const fieldWrap = style({
  minWidth: "220px",
  flex: 1,
});

export const toastRow = style({
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  flexWrap: "wrap",
});

export const technicalCardsPreview = style({
  marginTop: "0.2rem",
});

export const toggleGroupShell = style({
  display: "flex",
  alignItems: "center",
});

export const progressActions = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "0.55rem",
  marginTop: "0.45rem",
});

export const sectionTogglePreview = style({
  marginTop: "0.65rem",
});

export const progressPreview = style({
  marginTop: "0.85rem",
});

export const scopeChoicePreview = style({
  marginTop: "0.85rem",
});

export const stepperPreview = style({
  marginTop: "0.45rem",
});

export const listRowPreview = style({
  marginTop: "0.6rem",
  borderRadius: "var(--radius-surface)",
  background: "var(--colors-style-color015)",
  boxShadow: "0 8px 18px var(--colors-panel-shadow)",
  padding: "0.62rem 0.7rem",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "0.6rem",
});

export const listRowTitle = style({
  fontWeight: 600,
});

export const listRowSubtitle = style({
  marginTop: "0.2rem",
  color: "var(--colors-style-color070)",
  fontSize: "0.84rem",
});
