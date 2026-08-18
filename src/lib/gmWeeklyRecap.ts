import { readJson, writeJson } from "./browserStorage";
import { getDailyDateKey, subtractDaysFromDateKey } from "./dailyDraft";
import {
  formatDailyDraftModeLabel,
  getDailyDraftModeForGoalId,
  type DailyDraftMode,
} from "./dailyDraftMode";
import { formatOrdinal } from "./ordinal";
import { getOrCreatePlayerId } from "./playerRecord";

const WEEKLY_RECAP_SEEN_KEY = "ddgm:weekly-recap-seen";
const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";

type DailyScoreEntry = {
  playerId: string;
  goalId?: string;
  mode?: DailyDraftMode;
  percentile?: number;
};

type DailyScoreStore = Record<string, DailyScoreEntry[]>;

type WeeklyRecapSeenStore = Record<string, boolean>;

const loadSeenStore = (): WeeklyRecapSeenStore =>
  readJson<WeeklyRecapSeenStore>(WEEKLY_RECAP_SEEN_KEY) ?? {};

const saveSeenStore = (store: WeeklyRecapSeenStore) => {
  writeJson(WEEKLY_RECAP_SEEN_KEY, store);
};

const resolveEntryMode = (entry: DailyScoreEntry): DailyDraftMode =>
  entry.mode ??
  (typeof entry.goalId === "string"
    ? getDailyDraftModeForGoalId(entry.goalId)
    : "basic");

/** Monday date key for the week containing `date`. */
export const getWeeklyRecapWeekKey = (date = new Date()) => {
  const today = getDailyDateKey(date);
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return subtractDaysFromDateKey(today, daysSinceMonday);
};

const forEachDayInWeekSoFar = (
  weekKey: string,
  visit: (dateKey: string) => void,
) => {
  const today = getDailyDateKey();
  const weekEnd = subtractDaysFromDateKey(weekKey, -6);
  const endKey = today < weekEnd ? today : weekEnd;
  let cursor = weekKey;

  while (cursor <= endKey) {
    visit(cursor);
    if (cursor === endKey) {
      break;
    }
    cursor = subtractDaysFromDateKey(cursor, -1);
  }
};

const formatDateKeyShort = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const formatWeeklyRecapRangeLabel = (weekKey: string) => {
  const today = getDailyDateKey();
  const weekEnd = subtractDaysFromDateKey(weekKey, -6);
  const endKey = today < weekEnd ? today : weekEnd;
  return `${formatDateKeyShort(weekKey)}–${formatDateKeyShort(endKey)}`;
};

/** Count distinct calendar days with a Daily score from weekKey through today (in-week). */
export const countDailyDaysThisWeek = (
  playerId = getOrCreatePlayerId(),
  weekKey = getWeeklyRecapWeekKey(),
) => {
  const store = readJson<DailyScoreStore>(DAILY_SCORES_KEY) ?? {};
  let count = 0;

  forEachDayInWeekSoFar(weekKey, (cursor) => {
    const entries = store[cursor] ?? [];
    if (entries.some((entry) => entry.playerId === playerId)) {
      count += 1;
    }
  });

  return count;
};

export const countDailyModeDaysThisWeek = (
  playerId = getOrCreatePlayerId(),
  weekKey = getWeeklyRecapWeekKey(),
) => {
  const store = readJson<DailyScoreStore>(DAILY_SCORES_KEY) ?? {};
  let basic = 0;
  let advanced = 0;

  forEachDayInWeekSoFar(weekKey, (cursor) => {
    const modes = new Set(
      (store[cursor] ?? [])
        .filter((entry) => entry.playerId === playerId)
        .map(resolveEntryMode),
    );
    if (modes.has("basic")) {
      basic += 1;
    }
    if (modes.has("advanced")) {
      advanced += 1;
    }
  });

  return { basic, advanced };
};

export const getBestDailyPercentileThisWeek = (
  playerId = getOrCreatePlayerId(),
  weekKey = getWeeklyRecapWeekKey(),
) => {
  const store = readJson<DailyScoreStore>(DAILY_SCORES_KEY) ?? {};
  let best: number | null = null;

  forEachDayInWeekSoFar(weekKey, (cursor) => {
    for (const entry of store[cursor] ?? []) {
      if (entry.playerId !== playerId || typeof entry.percentile !== "number") {
        continue;
      }
      if (best == null || entry.percentile > best) {
        best = entry.percentile;
      }
    }
  });

  return best;
};

const formatDailyDaysSplitLabel = (basic: number, advanced: number) => {
  if (basic <= 0 && advanced <= 0) {
    return "No Daily yet";
  }

  return `${formatDailyDraftModeLabel("basic")} ${basic} · ${formatDailyDraftModeLabel("advanced")} ${advanced}`;
};

const formatBestDailyFinishLabel = (percentile: number | null) => {
  if (percentile == null) {
    return "—";
  }
  return `${formatOrdinal(Math.round(percentile))} percentile`;
};

export interface WeeklyGmRecap {
  weekKey: string;
  weekRangeLabel: string;
  dailyDaysThisWeek: number;
  dailyDaysSplitLabel: string;
  dailyPuzzlesThisWeek: number;
  bestDailyFinishLabel: string;
}

export const buildWeeklyGmRecap = (): WeeklyGmRecap => {
  const weekKey = getWeeklyRecapWeekKey();
  const modeDays = countDailyModeDaysThisWeek(undefined, weekKey);
  const bestPercentile = getBestDailyPercentileThisWeek(undefined, weekKey);

  return {
    weekKey,
    weekRangeLabel: formatWeeklyRecapRangeLabel(weekKey),
    dailyDaysThisWeek: countDailyDaysThisWeek(undefined, weekKey),
    dailyDaysSplitLabel: formatDailyDaysSplitLabel(
      modeDays.basic,
      modeDays.advanced,
    ),
    dailyPuzzlesThisWeek: modeDays.basic + modeDays.advanced,
    bestDailyFinishLabel: formatBestDailyFinishLabel(bestPercentile),
  };
};

export const hasSeenWeeklyRecap = (weekKey: string) =>
  Boolean(loadSeenStore()[weekKey]);

export const markWeeklyRecapSeen = (weekKey: string) => {
  const store = loadSeenStore();
  store[weekKey] = true;
  saveSeenStore(store);
};
