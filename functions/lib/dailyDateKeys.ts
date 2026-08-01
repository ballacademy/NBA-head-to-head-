/** Eastern-calendar helpers for Daily Draft API validation. */

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DAILY_TIMEZONE = "America/New_York";

export const isDailyDateKey = (value: string | null | undefined): value is string =>
  typeof value === "string" && DATE_KEY_PATTERN.test(value);

export const getEasternDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
};

export const subtractDaysFromDateKey = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year!, month! - 1, day!));
  utc.setUTCDate(utc.getUTCDate() - days);
  return utc.toISOString().slice(0, 10);
};

/** Accept today (ET) and yesterday for late submissions / timezone edge cases. */
export const isAllowedDailySubmissionDateKey = (
  dateKey: string,
  now = new Date(),
) => {
  if (!isDailyDateKey(dateKey)) {
    return false;
  }

  const today = getEasternDateKey(now);
  const yesterday = subtractDaysFromDateKey(today, 1);
  return dateKey === today || dateKey === yesterday;
};
