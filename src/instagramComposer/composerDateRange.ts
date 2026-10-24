import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
import {
  isoDateOnly,
  nbaTodayIso,
  shiftIsoDate,
} from "../playerOfTheDayComposer/lastGame";

export const COMPOSER_DATE_RANGE_KEY = "ddgm:composer-date-range";
export const COMPOSER_DATE_RANGE_EVENT = "ddgm:composer-date-range";
export const STAT_COVER_DATE_RANGE_KEY = "ddgm:stat-cover-date-range";
export const STAT_COVER_DATE_RANGE_EVENT = "ddgm:stat-cover-date-range";
export const DATE_RANGE_MAX_NIGHTS = 21;

export type DateRangePreset = "this-week" | "last-week" | "last-5" | "tonight" | "last-night" | "custom";
export type DateRangeChipSet = "night" | "week";

export const DATE_RANGE_CHIPS: Record<
  DateRangeChipSet,
  Array<{ id: Exclude<DateRangePreset, "custom">; label: string }>
> = {
  night: [
    { id: "tonight", label: "Tonight" },
    { id: "last-night", label: "Last night" },
    { id: "this-week", label: "This week" },
    { id: "last-week", label: "Last week" },
    { id: "last-5", label: "Last 5 days" },
  ],
  week: [
    { id: "this-week", label: "This week" },
    { id: "last-week", label: "Last week" },
    { id: "last-5", label: "Last 5 days" },
    { id: "tonight", label: "Tonight" },
    { id: "last-night", label: "Last night" },
  ],
};

export const SIMPLE_DATE_RANGE_CHIP_IDS: Record<
  DateRangeChipSet,
  Array<Exclude<DateRangePreset, "custom">>
> = {
  night: ["tonight", "last-night"],
  week: ["this-week", "last-week"],
};

export const dateRangeChipsForHud = (
  set: DateRangeChipSet,
  simple: boolean,
) => {
  const chips = DATE_RANGE_CHIPS[set];
  if (!simple) {
    return chips;
  }
  const allowed = new Set<string>(SIMPLE_DATE_RANGE_CHIP_IDS[set]);
  return chips.filter((chip) => allowed.has(chip.id));
};

export interface ComposerDateRange {
  from: string;
  to: string;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const clampIso = (value: string, fallback: string) => isoDateOnly(value) || fallback;

export const mondayOfIsoWeek = (iso: string) => {
  const token = isoDateOnly(iso) || nbaTodayIso();
  const [year, month, day] = token.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return shiftIsoDate(token, delta);
};

export const thisWeekRange = (now = new Date()): ComposerDateRange => {
  const today = nbaTodayIso(now);
  const from = mondayOfIsoWeek(today);
  return { from, to: shiftIsoDate(from, 6) };
};

export const lastWeekRange = (now = new Date()): ComposerDateRange => {
  const current = thisWeekRange(now);
  return {
    from: shiftIsoDate(current.from, -7),
    to: shiftIsoDate(current.to, -7),
  };
};

export const last5DaysRange = (now = new Date()): ComposerDateRange => {
  const today = nbaTodayIso(now);
  return { from: shiftIsoDate(today, -4), to: today };
};

export const nextNDaysRange = (
  nights = 7,
  now = new Date(),
): ComposerDateRange => {
  const today = nbaTodayIso(now);
  const span = Math.max(1, Math.min(DATE_RANGE_MAX_NIGHTS, Math.round(nights)));
  return { from: today, to: shiftIsoDate(today, span - 1) };
};

export const tonightRange = (now = new Date()): ComposerDateRange => {
  const today = nbaTodayIso(now);
  return { from: today, to: today };
};

export const lastNightRange = (now = new Date()): ComposerDateRange => {
  const yesterday = shiftIsoDate(nbaTodayIso(now), -1);
  return { from: yesterday, to: yesterday };
};

export const normalizeDateRange = (
  from: string,
  to: string,
  now = new Date(),
): ComposerDateRange => {
  const today = nbaTodayIso(now);
  let start = clampIso(from, today);
  let end = clampIso(to, start);
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  return { from: start, to: end };
};

export const datesInInclusiveRange = (
  from: string,
  to: string,
  cap = DATE_RANGE_MAX_NIGHTS,
) => {
  const range = normalizeDateRange(from, to);
  const dates: string[] = [];
  let cursor = range.from;
  while (cursor <= range.to && dates.length < cap) {
    dates.push(cursor);
    cursor = shiftIsoDate(cursor, 1);
  }
  return dates;
};

const monthDay = (iso: string) => {
  const match = isoDateOnly(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return iso;
  }
  const month = MONTHS[Number(match[2]) - 1] ?? "";
  return `${month} ${Number(match[3])}`;
};

export const rangeWeekLine = (from: string, to: string) => {
  const range = normalizeDateRange(from, to);
  const startMatch = range.from.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const endMatch = range.to.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!startMatch || !endMatch) {
    return "";
  }
  const startYear = startMatch[1];
  const endYear = endMatch[1];
  if (range.from === range.to) {
    return `${monthDay(range.from)}, ${startYear}`;
  }
  const startLabel = monthDay(range.from);
  const endDay = Number(endMatch[3]);
  const sameMonth = startMatch[2] === endMatch[2];
  const endLabel = sameMonth ? String(endDay) : monthDay(range.to);
  if (startYear === endYear) {
    return `${startLabel} – ${endLabel}, ${endYear}`;
  }
  return `${startLabel}, ${startYear} – ${endLabel}, ${endYear}`;
};

export const isAutoWeekLine = (week: string, from: string, to: string) => {
  const current = week.replace(/\s+/g, " ").trim().toUpperCase();
  if (!current) {
    return true;
  }
  return current === rangeWeekLine(from, to).toUpperCase();
};

export const matchDateRangePreset = (
  from: string,
  to: string,
  now = new Date(),
): DateRangePreset => {
  const range = normalizeDateRange(from, to, now);
  const same = (other: ComposerDateRange) =>
    range.from === other.from && range.to === other.to;
  if (same(tonightRange(now))) {
    return "tonight";
  }
  if (same(lastNightRange(now))) {
    return "last-night";
  }
  if (same(thisWeekRange(now))) {
    return "this-week";
  }
  if (same(lastWeekRange(now))) {
    return "last-week";
  }
  if (same(last5DaysRange(now))) {
    return "last-5";
  }
  return "custom";
};

export const rangeForPreset = (
  preset: Exclude<DateRangePreset, "custom">,
  now = new Date(),
): ComposerDateRange => {
  if (preset === "tonight") {
    return tonightRange(now);
  }
  if (preset === "last-night") {
    return lastNightRange(now);
  }
  if (preset === "last-week") {
    return lastWeekRange(now);
  }
  if (preset === "last-5") {
    return last5DaysRange(now);
  }
  return thisWeekRange(now);
};

export const parseComposerDateRange = (
  stored: unknown,
  now = new Date(),
  fallback = thisWeekRange(now),
): ComposerDateRange => {
  if (!stored || typeof stored !== "object") {
    return fallback;
  }
  const rec = stored as { from?: unknown; to?: unknown };
  const from = typeof rec.from === "string" ? isoDateOnly(rec.from) : "";
  const to = typeof rec.to === "string" ? isoDateOnly(rec.to) : "";
  if (!from || !to) {
    return fallback;
  }
  return normalizeDateRange(from, to, now);
};

export const readComposerDateRange = (
  now = new Date(),
  storageKey = COMPOSER_DATE_RANGE_KEY,
  fallback = thisWeekRange(now),
) => parseComposerDateRange(readJson<unknown>(storageKey), now, fallback);

export const writeComposerDateRange = (
  range: ComposerDateRange,
  now = new Date(),
  storageKey = COMPOSER_DATE_RANGE_KEY,
  eventName = COMPOSER_DATE_RANGE_EVENT,
) => {
  const next = normalizeDateRange(range.from, range.to, now);
  writeJson(storageKey, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(eventName));
  }
  return next;
};

export function useComposerDateRange(
  options: {
    storageKey?: string;
    eventName?: string;
    fallback?: (now?: Date) => ComposerDateRange;
  } = {},
) {
  const storageKey = options.storageKey ?? COMPOSER_DATE_RANGE_KEY;
  const eventName = options.eventName ?? COMPOSER_DATE_RANGE_EVENT;
  const fallbackFn = options.fallback ?? thisWeekRange;
  const [range, setRangeState] = useState<ComposerDateRange>(() =>
    readComposerDateRange(new Date(), storageKey, fallbackFn()),
  );
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const setRange = useCallback(
    (next: ComposerDateRange) => {
      const written = writeComposerDateRange(
        next,
        new Date(),
        storageKey,
        eventName,
      );
      setRangeState(written);
      return written;
    },
    [eventName, storageKey],
  );

  useEffect(() => {
    const sync = () => {
      const next = readComposerDateRange(
        new Date(),
        storageKey,
        fallbackFn(),
      );
      if (
        next.from !== rangeRef.current.from ||
        next.to !== rangeRef.current.to
      ) {
        setRangeState(next);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(eventName, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(eventName, sync);
    };
  }, [eventName, fallbackFn, storageKey]);

  return { range, setRange };
}

export function useStatCoverDateRange() {
  return useComposerDateRange({
    storageKey: STAT_COVER_DATE_RANGE_KEY,
    eventName: STAT_COVER_DATE_RANGE_EVENT,
    fallback: tonightRange,
  });
}
