import { globalStyle, style } from "@vanilla-extract/css";

export const wrap = style({
  marginTop: "0.8rem",
  borderRadius: "14px",
  border: 0,
  background: "var(--colors-style-color049)",
  boxShadow: "0 10px 22px var(--colors-panel-shadow)",
  overflow: "auto",
});

export const table = style({
  width: "100%",
  minWidth: "680px",
  borderCollapse: "collapse",
  '@media': {
    '(max-width: 760px)': {
      minWidth: "620px",
    },
    '(max-width: 640px)': {
      minWidth: "520px",
    },
  },
});

globalStyle(`${table} th, ${table} td`, {
  borderBottom: "1px solid var(--colors-style-color050)",
  padding: "0.7rem 0.75rem",
  textAlign: "left",
  verticalAlign: "middle",
});

globalStyle(`${table} th`, {
  fontSize: "0.76rem",
  color: "var(--colors-style-color051)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background: "var(--colors-style-color052)",
  position: "sticky",
  top: 0,
  zIndex: 1,
});

globalStyle(`${table} tbody tr:hover`, {
  background: "var(--colors-style-color053)",
});

globalStyle(`${table} tbody tr`, {
  cursor: "pointer",
});

export const appCell = style({
  display: "flex",
  alignItems: "center",
  gap: "0.72rem",
  minWidth: 0,
});

export const icon = style({
  width: "56px",
  height: "56px",
  borderRadius: "12px",
  objectFit: "contain",
  flex: "0 0 auto",
  '@media': {
    '(max-width: 640px)': {
      width: "48px",
      height: "48px",
    },
  },
});

export const iconPlaceholder = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px dashed var(--colors-style-color001)",
  background: "var(--colors-style-color002)",
  color: "var(--colors-style-color003)",
  fontSize: "0.58rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
});

export const appCopy = style({
  minWidth: 0,
  maxWidth: "min(40vw, 420px)",
  display: "grid",
  gap: "0.14rem",
});

export const appName = style({
  display: "block",
  fontSize: "0.98rem",
  color: "var(--colors-style-color054)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const appId = style({
  display: "block",
  color: "var(--colors-style-color055)",
  fontSize: "0.8rem",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  '@media': {
    '(max-width: 980px)': {
      display: "none",
    },
  },
});

export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  border: "1px solid var(--colors-style-color056)",
  background: "var(--colors-style-color057)",
  color: "var(--colors-style-color058)",
  padding: "0.22rem 0.58rem",
  fontSize: "0.8rem",
});

export const versionChip = style({
  maxWidth: "16ch",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const colVersion = style({
  textAlign: "center",
});

export const colScope = style({
  textAlign: "center",
  '@media': {
    '(max-width: 640px)': {
      display: "none",
    },
  },
});

export const colInstalled = style({
  textAlign: "center",
  color: "var(--colors-style-color066)",
  fontSize: "0.85rem",
  '@media': {
    '(max-width: 760px)': {
      display: "none",
    },
  },
});

export const colAction = style({
  textAlign: "right",
  width: "1%",
  whiteSpace: "nowrap",
  '@media': {
    '(max-width: 640px)': {
      display: "none",
    },
  },
});

export const sortButton = style({
  border: 0,
  background: "transparent",
  color: "inherit",
  padding: 0,
  margin: 0,
  font: "inherit",
  letterSpacing: "inherit",
  textTransform: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.32rem",
  cursor: "pointer",
  selectors: {
    '&:focus-visible': {
      outline: "none",
      boxShadow: "0 0 0 3px var(--colors-select-focus-ring)",
      borderRadius: "8px",
    },
  },
});

export const sortIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "0.9rem",
  fontSize: "0.8rem",
  color: "var(--colors-style-color055)",
});

globalStyle(`${table} th.${colVersion}, ${table} td.${colVersion}`, {
  textAlign: "center",
});

globalStyle(`${table} th.${colScope}, ${table} td.${colScope}`, {
  textAlign: "center",
});

globalStyle(`${table} th.${colInstalled}, ${table} td.${colInstalled}`, {
  textAlign: "center",
});

globalStyle(`${table} th.${colAction}, ${table} td.${colAction}`, {
  textAlign: "right",
});
