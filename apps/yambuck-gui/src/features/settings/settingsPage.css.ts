import { style } from "@vanilla-extract/css";

export const pagePanel = style({});

export const tabs = style({
  display: "flex",
  justifyContent: "center",
  gap: "0.55rem",
  margin: "0.95rem 0 0.9rem",
});

export const tabDescription = style({
  margin: "0 0 0.8rem",
  color: "var(--colors-style-color070)",
  textAlign: "center",
});

export const settingsGrid = style({
  display: "grid",
  gridTemplateColumns: "1fr",
  rowGap: "0.25rem",
  borderTop: "1px solid var(--colors-style-color068)",
  paddingTop: "0.9rem",
});

export const settingCard = style({
  padding: "0.2rem 0 0.35rem",
  selectors: {
    '&:not(:first-child)': {
      borderTop: "1px solid var(--colors-style-color068)",
      paddingTop: "1rem",
    },
  },
});

export const settingCardDescription = style({
  color: "var(--colors-style-color070)",
  margin: "0.45rem 0 0.8rem",
});

export const debugStack = style({
  display: "grid",
  gap: "0.25rem",
  borderTop: "1px solid var(--colors-style-color068)",
  paddingTop: "0.9rem",
});

export const debugSection = style({
  padding: "0.35rem 0 0.65rem",
  selectors: {
    '&:not(:first-child)': {
      borderTop: "1px solid var(--colors-style-color068)",
      paddingTop: "1rem",
    },
  },
});

export const systemInfoList = style({
  margin: "0.45rem 0 0",
  paddingLeft: "1.1rem",
  display: "grid",
  gap: "0.35rem",
  color: "var(--colors-style-color071)",
});

export const systemInfoCode = style({
  background: "var(--colors-style-color072)",
  border: "1px solid var(--colors-style-color073)",
  borderRadius: "7px",
  padding: "0.08rem 0.35rem",
  color: "var(--colors-style-color074)",
});

export const logView = style({
  margin: "0.45rem 0 0",
  borderRadius: "10px",
  border: "1px solid var(--colors-style-color075)",
  background: "var(--colors-style-color005)",
  color: "var(--colors-style-color076)",
  maxHeight: "220px",
  overflow: "auto",
  padding: "0.65rem",
  fontSize: "0.78rem",
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});
