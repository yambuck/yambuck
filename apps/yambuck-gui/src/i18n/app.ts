import appEn from "./en/app.json";

type MessageValue = string | number;
type MessageParams = Record<string, MessageValue | undefined>;

const appDictionary = appEn as Record<string, string>;

export const appText = (key: string, params?: MessageParams): string => {
  const template = appDictionary[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, paramName: string) => {
    const value = params[paramName];
    return value === undefined ? `{${paramName}}` : String(value);
  });
};
