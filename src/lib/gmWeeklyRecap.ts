import { formatGmRecordLine } from "./gmStats";
import { readJson, writeJson } from "./browserStorage";
import { getDailyDateKey, subtractDaysFromDateKey } from "./dailyDraft";
import {
  formatDailyDraftModeLabel,
  getDailyDraftModeForGoalId,
  type DailyDraftMode,
} from "./dailyDraftMode";
import { formatOrdinal } from "./ordinal";
import { getOrCreatePlayerId, type HeadToHeadResult, type MatchRecordMode } from "./playerRecord";

const WEEKLY_RECAP_SEEN_KEY = "ddgm:weekly-recap-seen";
const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";
const WEEKLY_H2H_KEY = "ddgm:weekly-h2h";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DailyScoreEntry = {
  playerId?: string;
  goalId?: string;
  mode?: DailyDraftMode;
  percentile?: number;
};

type DailyScoreStore = Record<string, DailyScoreEntry[] | unknown>;

type WeeklyRecapSeenStore = Record<string, boolean>;

const loadSeenStore = (): WeeklyRecapSeenStore =>
  readJson<WeeklyRecapSeenStore>(WEEKLY_RECAP_SEEN_KEY) ?? {};

const saveSeenStore = (store: WeeklyRecapSeenStore) => {
  writeJson(WEEKLY_RECAP_SEEN_KEY, store);
};

const loadDailyScoreStore = (): DailyScoreStore => {
  const saved = readJson<DailyScoreStore>(DAILY_SCORES_KEY);
  return saved && typeof saved === "object" ? saved : {};
};

const resolveEntryMode = (entry: DailyScoreEntry): DailyDraftMode =>
  entry.mode === "basic" || entry.mode === "advanced"
    ? entry.mode
    : typeof entry.goalId === "string"
      ? getDailyDraftModeForGoalId(entry.goalId)
      : "basic";

const belongsToPlayer = (entry: DailyScoreEntry, playerId: string) => {
  if (typeof entry.playerId !== "string" || entry.playerId.length === 0) {
    return true;
  }
  return entry.playerId === playerId;
};

const playerHasAnyScores = (store: DailyScoreStore, playerId: string) =>
  Object.values(store).some(
    (raw) =>
      Array.isArray(raw) &&
      raw.some(
        (entry) =>
          typeof entry?.playerId === "string" && entry.playerId === playerId,
      ),
  );

/** Monday date key for the week containing `date`. */
export const getWeeklyRecapWeekKey = (date = new Date()) => {
  const today = getDailyDateKey(date);
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return subtractDaysFromDateKey(today, daysSinceMonday);
};

/** Monday of the last completed Mon–Sun week (not the in-progress week). */
export const getLastCompletedWeeklyRecapWeekKey = (date = new Date()) =>
  subtractDaysFromDateKey(getWeeklyRecapWeekKey(date), 7);

const weekEndDateKey = (weekKey: string) =>
  subtractDaysFromDateKey(weekKey, -6);

const entriesForWeek = (
  store: DailyScoreStore,
  weekKey: string,
  playerId: string,
) => {
  const weekEnd = weekEndDateKey(weekKey);
  const restrictToPlayer = playerHasAnyScores(store, playerId);
  const matched: { dateKey: string; entry: DailyScoreEntry }[] = [];

  for (const [dateKey, raw] of Object.entries(store)) {
    if (
      !DATE_KEY_PATTERN.test(dateKey) ||
      dateKey < weekKey ||
      dateKey > weekEnd ||
      !Array.isArray(raw)
    ) {
      continue;
    }

    for (const entry of raw) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      if (restrictToPlayer && !belongsToPlayer(entry, playerId)) {
        continue;
      }
      matched.push({ dateKey, entry });
    }
  }

  return matched;
};

const formatDateKeyShort = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const formatWeeklyRecapRangeLabel = (
  weekKey: string,
  throughToday = false,
) => {
  const weekEnd = weekEndDateKey(weekKey);
  const today = getDailyDateKey();
  const endKey = throughToday && today < weekEnd ? today : weekEnd;
  return `${formatDateKeyShort(weekKey)}–${formatDateKeyShort(endKey)}`;
};

const summarizeWeek = (
  weekKey: string,
  playerId: string,
  store: DailyScoreStore,
) => {
  const matched = entriesForWeek(store, weekKey, playerId);
  const days = new Set(matched.map((row) => row.dateKey));
  let basic = 0;
  let advanced = 0;
  let bestPercentile: number | null = null;

  const modesByDay = new Map<string, Set<DailyDraftMode>>();
  for (const row of matched) {
    const modes = modesByDay.get(row.dateKey) ?? new Set<DailyDraftMode>();
    modes.add(resolveEntryMode(row.entry));
    modesByDay.set(row.dateKey, modes);

    if (typeof row.entry.percentile === "number") {
      if (bestPercentile == null || row.entry.percentile > bestPercentile) {
        bestPercentile = row.entry.percentile;
      }
    }
  }

  for (const modes of modesByDay.values()) {
    if (modes.has("basic")) {
      basic += 1;
    }
    if (modes.has("advanced")) {
      advanced += 1;
    }
  }

  return {
    dailyDays: days.size,
    basic,
    advanced,
    dailyPuzzles: basic + advanced,
    bestPercentile,
  };
};

/** Count distinct calendar days with a Daily score in the Mon–Sun week. */
export const countDailyDaysThisWeek = (
  playerId = getOrCreatePlayerId(),
  weekKey = getLastCompletedWeeklyRecapWeekKey(),
) => summarizeWeek(weekKey, playerId, loadDailyScoreStore()).dailyDays;

export const countDailyModeDaysThisWeek = (
  playerId = getOrCreatePlayerId(),
  weekKey = getLastCompletedWeeklyRecapWeekKey(),
) => {
  const summary = summarizeWeek(weekKey, playerId, loadDailyScoreStore());
  return { basic: summary.basic, advanced: summary.advanced };
};

export const getBestDailyPercentileThisWeek = (
  playerId = getOrCreatePlayerId(),
  weekKey = getLastCompletedWeeklyRecapWeekKey(),
) => summarizeWeek(weekKey, playerId, loadDailyScoreStore()).bestPercentile;

interface WeeklyH2hRecord {
  wins: number;
  losses: number;
  ties: number;
}

type WeeklyH2hByWeekStore = Record<string, WeeklyH2hRecord | undefined>;
type WeeklyH2hStore = Record<string, WeeklyH2hByWeekStore | undefined>;

const loadWeeklyH2hStore = (): WeeklyH2hStore =>
  readJson<WeeklyH2hStore>(WEEKLY_H2H_KEY) ?? {};

/** Call this after every persisted casual / pro H2H match result. */
export const recordWeeklyH2hResult = (
  result: HeadToHeadResult,
  playerId: string,
  _mode: MatchRecordMode = "headToHead",
) => {
  const weekKey = getWeeklyRecapWeekKey();
  const store = loadWeeklyH2hStore();
  const byWeek = store[playerId] ?? {};
  const current = byWeek[weekKey] ?? { wins: 0, losses: 0, ties: 0 };
  if (result === "win") {
    current.wins += 1;
  } else if (result === "loss") {
    current.losses += 1;
  } else {
    current.ties += 1;
  }
  byWeek[weekKey] = current;
  store[playerId] = byWeek;
  writeJson(WEEKLY_H2H_KEY, store);
};

export const getWeeklyH2hRecord = (
  weekKey: string,
  playerId = getOrCreatePlayerId(),
): WeeklyH2hRecord => loadWeeklyH2hStore()[playerId]?.[weekKey] ?? { wins: 0, losses: 0, ties: 0 };

const formatDailyDaysSplitLabel = (basic: number, advanced: number) => {
  if (basic <= 0 && advanced <= 0) {
    return "No puzzles scored";
  }

  return `${formatDailyDraftModeLabel("basic")} ${basic} · ${formatDailyDraftModeLabel("advanced")} ${advanced}`;
};

const formatBestDailyFinishLabel = (percentile: number | null) => {
  if (percentile == null) {
    return "—";
  }
  return `${formatOrdinal(Math.round(percentile))} percentile`;
};

const formatWinPctLabel = (wins: number, losses: number, ties: number) => {
  const total = wins + losses + ties;
  if (total <= 0) {
    return "—";
  }

  return `${Math.round((wins / total) * 100)}%`;
};

export interface WeeklyGmRecap {
  weekKey: string;
  weekRangeLabel: string;
  periodLabel: "Last week";
  dailyDays: number;
  dailyDaysSplitLabel: string;
  dailyPuzzles: number;
  bestDailyFinishLabel: string;
  h2hWins: number;
  h2hLosses: number;
  h2hTies: number;
  h2hMatches: number;
  h2hRecordLabel: string;
  h2hWinPctLabel: string;
}

export const formatWeeklyRecapLede = (recap: Pick<WeeklyGmRecap, "periodLabel" | "weekRangeLabel">) =>
  `${recap.periodLabel} · ${recap.weekRangeLabel}`;

export const buildWeeklyGmRecap = (): WeeklyGmRecap => {
  const playerId = getOrCreatePlayerId();
  const store = loadDailyScoreStore();
  const weekKey = getLastCompletedWeeklyRecapWeekKey();
  const summary = summarizeWeek(weekKey, playerId, store);
  const h2h = getWeeklyH2hRecord(weekKey, playerId);

  return {
    weekKey,
    weekRangeLabel: formatWeeklyRecapRangeLabel(weekKey),
    periodLabel: "Last week",
    dailyDays: summary.dailyDays,
    dailyDaysSplitLabel: formatDailyDaysSplitLabel(
      summary.basic,
      summary.advanced,
    ),
    dailyPuzzles: summary.dailyPuzzles,
    bestDailyFinishLabel: formatBestDailyFinishLabel(summary.bestPercentile),
    h2hWins: h2h.wins,
    h2hLosses: h2h.losses,
    h2hTies: h2h.ties,
    h2hMatches: h2h.wins + h2h.losses + h2h.ties,
    h2hRecordLabel: formatGmRecordLine(h2h.wins, h2h.losses, h2h.ties),
    h2hWinPctLabel: formatWinPctLabel(h2h.wins, h2h.losses, h2h.ties),
  };
};

export const hasSeenWeeklyRecap = (weekKey: string) =>
  Boolean(loadSeenStore()[weekKey]);

export const markWeeklyRecapSeen = (weekKey: string) => {
  const store = loadSeenStore();
  store[weekKey] = true;
  saveSeenStore(store);
};
