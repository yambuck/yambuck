import { tokens, tokensToCssVars } from "./tokens";

export const initDesignTokens = () => {
  const vars = tokensToCssVars(tokens);
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
};
