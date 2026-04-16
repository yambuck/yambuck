export const DESCRIPTION_LIMIT = 500;
export const NOT_SPECIFIED = "Not specified";

export const truncateDescription = (text: string, maxChars = DESCRIPTION_LIMIT) => {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars).trimEnd()}...`;
};

export const displayOrFallback = (value?: string) => {
  if (!value || value.trim().length === 0) {
    return NOT_SPECIFIED;
  }
  return value;
};
