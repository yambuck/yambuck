const twoDigit = (value: number): string => value.toString().padStart(2, "0");

const threeDigit = (value: number): string => value.toString().padStart(3, "0");

const offsetForDate = (date: Date): string => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = twoDigit(Math.floor(absoluteOffset / 60));
  const offsetRemainderMinutes = twoDigit(absoluteOffset % 60);
  return `${sign}${offsetHours}:${offsetRemainderMinutes}`;
};

export const toIso8601WithOffset = (date: Date): string => {
  const year = date.getFullYear();
  const month = twoDigit(date.getMonth() + 1);
  const day = twoDigit(date.getDate());
  const hours = twoDigit(date.getHours());
  const minutes = twoDigit(date.getMinutes());
  const seconds = twoDigit(date.getSeconds());
  const millis = threeDigit(date.getMilliseconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${offsetForDate(date)}`;
};

export const toReadableLocalTimeWithOffset = (date: Date): string => {
  const monthLabel = date.toLocaleString(undefined, { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = twoDigit(date.getHours());
  const minutes = twoDigit(date.getMinutes());
  const seconds = twoDigit(date.getSeconds());
  return `${monthLabel} ${day}, ${year}, ${hours}:${minutes}:${seconds} (${offsetForDate(date)})`;
};

export const formatCanonicalTimestampForDisplay = (value: string): string => {
  const timestamp = value.trim();
  if (!timestamp) {
    return "Unknown";
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return toReadableLocalTimeWithOffset(parsed);
};

export const formatCompactTimestampForTable = (value: string): string => {
  const timestamp = value.trim();
  if (!timestamp) {
    return "Unknown";
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
};
