import { useCallback, useEffect, useState } from "react";
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

export const readComposerNightDate = (now = new Date()) => {
  const stored = readJson<unknown>(COMPOSER_NIGHT_KEY);
  return isoDateOnly(typeof stored === "string" ? stored : "") || nbaTodayIso(now);
};

export const writeComposerNightDate = (iso: string, now = new Date()) => {
  const next = isoDateOnly(iso) || nbaTodayIso(now);
  writeJson(COMPOSER_NIGHT_KEY, next);
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

  const setDate = useCallback((iso: string) => {
    setDateState(writeComposerNightDate(iso));
  }, []);

  useEffect(() => {
    const sync = () => setDateState(readComposerNightDate());
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

  const ensureStandouts = useCallback(async (iso = date) => {
    setLoading(true);
    try {
      const rows = await fetchNightStandouts(iso);
      setStandouts(rows);
      return rows;
    } finally {
      setLoading(false);
    }
  }, [date]);

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
