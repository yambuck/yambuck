export const tokens = {
  font: {
    familySans: '"Sora", "DM Sans", "Segoe UI", sans-serif',
  },
  colors: {
    textPrimary: "#e7eff8",
    topbarTitle: "#9ed7ff",
    surfaceBorder: "rgba(151, 195, 227, 0.24)",
    shellBackground: "radial-gradient(circle at 20% 0%, #154067 0%, #0c1724 45%, #070d16 100%)",
    topbarBackground: "linear-gradient(120deg, rgba(19, 42, 69, 0.93), rgba(10, 22, 38, 0.9))",
    controlBackground: "rgba(17, 34, 52, 0.72)",
    controlBorder: "rgba(143, 185, 216, 0.45)",
    controlText: "#cae4f9",
    controlHoverBackground: "rgba(36, 65, 94, 0.92)",
    closeControlBackground: "rgba(143, 38, 47, 0.55)",
    closeControlBorder: "rgba(255, 148, 148, 0.45)",
    closeControlHoverBackground: "rgba(182, 45, 58, 0.76)",
    toggleText: "#c6e3fd",
    toastShadow: "rgba(0, 0, 0, 0.28)",
    toastInfoBg: "rgb(19, 59, 88)",
    toastInfoBorder: "rgba(121, 197, 255, 0.45)",
    toastInfoText: "#d4ecff",
    toastSuccessBg: "rgb(16, 78, 57)",
    toastSuccessBorder: "rgba(132, 236, 196, 0.48)",
    toastSuccessText: "#d7ffef",
    toastWarningBg: "rgb(92, 61, 17)",
    toastWarningBorder: "rgba(255, 213, 142, 0.55)",
    toastWarningText: "#ffeacc",
    toastErrorBg: "rgb(88, 20, 27)",
    toastErrorBorder: "rgba(255, 149, 149, 0.55)",
    toastErrorText: "#ffd9dd",
  },
} as const;

export const tokensToCssVars = (value: unknown, prefix = "--"): Record<string, string> => {
  const vars: Record<string, string> = {};

  const walk = (node: unknown, currentPrefix: string) => {
    if (!node || typeof node !== "object") {
      return;
    }

    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      const kebab = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      const nextPrefix = `${currentPrefix}${kebab}`;
      if (child && typeof child === "object") {
        walk(child, `${nextPrefix}-`);
      } else if (typeof child === "string") {
        vars[nextPrefix] = child;
      }
    }
  };

  walk(value, prefix);
  return vars;
};
