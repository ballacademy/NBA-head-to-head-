import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
import {
  isoDateOnly,
  nbaTodayIso,
  shiftIsoDate,
} from "../playerOfTheDayComposer/lastGame";
import {
  fetchNightStandouts,
  type NightStandout,
} from "../playerOfTheDayComposer/nightStandouts";

export const COMPOSER_NIGHT_KEY = "ddgm:composer-night-date";
export const COMPOSER_NIGHT_EVENT = "ddgm:composer-night-date";

/** Keep Tonight / Last night (or a same-day custom date). Drop stale slates. */
export const parseComposerNightDate = (
  stored: unknown,
  now = new Date(),
) => {
  const today = nbaTodayIso(now);
  const yesterday = shiftIsoDate(today, -1);
  let date = "";
  let asOf = "";
  if (typeof stored === "string") {
    date = isoDateOnly(stored);
  } else if (stored && typeof stored === "object") {
    const rec = stored as { date?: unknown; asOf?: unknown };
    date = isoDateOnly(String(rec.date ?? ""));
    asOf = isoDateOnly(String(rec.asOf ?? ""));
  }
  if (date && asOf === today) {
    return date;
  }
  if (date === today || date === yesterday) {
    return date;
  }
  return today;
};

export const readComposerNightDate = (now = new Date()) =>
  parseComposerNightDate(readJson<unknown>(COMPOSER_NIGHT_KEY), now);

export const writeComposerNightDate = (iso: string, now = new Date()) => {
  const today = nbaTodayIso(now);
  const next = isoDateOnly(iso) || today;
  writeJson(COMPOSER_NIGHT_KEY, { date: next, asOf: today });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPOSER_NIGHT_EVENT));
  }
  return next;
};

export const composerNightHeading = (
  date: string,
  todayIso = nbaTodayIso(),
  yesterdayIso = shiftIsoDate(todayIso, -1),
) => {
  if (date === todayIso) {
    return "Tonight’s standouts";
  }
  if (date === yesterdayIso) {
    return "Last night’s standouts";
  }
  return `Standouts · ${date}`;
};

export const nightStandoutPickerRows = (rows: NightStandout[]) =>
  rows.map((row) => ({
    id: row.athleteId,
    badge: row.badge,
    meta: row.line,
  }));

export function useComposerNight() {
  const todayIso = nbaTodayIso();
  const yesterdayIso = shiftIsoDate(todayIso, -1);
  const [date, setDateState] = useState(readComposerNightDate);
  const [standouts, setStandouts] = useState<NightStandout[]>([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);
  const dateRef = useRef(date);
  dateRef.current = date;

  const setDate = useCallback((iso: string) => {
    const next = writeComposerNightDate(iso);
    if (next !== dateRef.current) {
      requestRef.current += 1;
      setStandouts([]);
    }
    setDateState(next);
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = readComposerNightDate();
      if (next !== dateRef.current) {
        requestRef.current += 1;
        setStandouts([]);
      }
      setDateState(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === COMPOSER_NIGHT_KEY || event.key === null) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(COMPOSER_NIGHT_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COMPOSER_NIGHT_EVENT, sync);
    };
  }, []);

  const ensureStandouts = useCallback(async (iso?: string) => {
    const target = isoDateOnly(iso ?? dateRef.current) || dateRef.current;
    const id = requestRef.current + 1;
    requestRef.current = id;
    setLoading(true);
    try {
      const rows = await fetchNightStandouts(target);
      if (id !== requestRef.current) {
        return rows;
      }
      setStandouts(rows);
      return rows;
    } finally {
      if (id === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  return {
    date,
    todayIso,
    yesterdayIso,
    setDate,
    standouts,
    loading,
    heading: composerNightHeading(date, todayIso, yesterdayIso),
    ensureStandouts,
  };
}
