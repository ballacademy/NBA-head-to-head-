import { getDailyDateKey, subtractDaysFromDateKey } from "./dailyDraft";
import type { DailyDraftMode } from "./dailyDraftMode";
import { loadDailyScoresForDate } from "./dailyDraftScores";
import { getOrCreatePlayerId } from "./playerRecord";
import { readJson } from "./browserStorage";

const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";

export interface DailyDraftPlayStreak {
  mode: DailyDraftMode;
  current: number;
  lastPlayedDateKey: string | null;
  /** True when the streak is still alive today (played today or yesterday). */
  active: boolean;
}

type DailyScoreStore = Record<
  string,
  Array<{
    playerId?: string;
    mode?: DailyDraftMode;
    goalId?: string;
  }>
>;

const resolveMode = (
  entry: { mode?: DailyDraftMode; goalId?: string },
): DailyDraftMode => {
  if (entry.mode === "basic" || entry.mode === "advanced") {
    return entry.mode;
  }

  if (typeof entry.goalId === "string" && entry.goalId.startsWith("adv-")) {
    return "advanced";
  }

  return "basic";
};

export const getCompletedDailyDraftDateKeys = (
  mode: DailyDraftMode,
  playerId = getOrCreatePlayerId(),
): string[] => {
  const store = readJson<DailyScoreStore>(DAILY_SCORES_KEY) ?? {};
  const dateKeys = Object.keys(store).filter((dateKey) => {
    const dayEntries = store[dateKey] ?? [];
    return dayEntries.some(
      (entry) =>
        entry.playerId === playerId && resolveMode(entry) === mode,
    );
  });

  return dateKeys.sort((left, right) => left.localeCompare(right));
};

export const getDailyDraftPlayStreak = (
  mode: DailyDraftMode,
  asOfDateKey = getDailyDateKey(),
  playerId = getOrCreatePlayerId(),
): DailyDraftPlayStreak => {
  const completed = new Set(getCompletedDailyDraftDateKeys(mode, playerId));
  const playedToday = completed.has(asOfDateKey);
  const playedYesterday = completed.has(
    subtractDaysFromDateKey(asOfDateKey, 1),
  );

  if (!playedToday && !playedYesterday) {
    const lastPlayedDateKey =
      [...completed].reverse().find((dateKey) => dateKey < asOfDateKey) ?? null;

    return {
      mode,
      current: 0,
      lastPlayedDateKey,
      active: false,
    };
  }

  let cursor = playedToday
    ? asOfDateKey
    : subtractDaysFromDateKey(asOfDateKey, 1);
  let current = 0;

  while (completed.has(cursor)) {
    current += 1;
    cursor = subtractDaysFromDateKey(cursor, 1);
  }

  return {
    mode,
    current,
    lastPlayedDateKey: playedToday
      ? asOfDateKey
      : subtractDaysFromDateKey(asOfDateKey, 1),
    active: true,
  };
};

export const formatDailyDraftPlayStreak = (streak: DailyDraftPlayStreak) => {
  if (streak.current <= 0) {
    return "No streak";
  }

  if (streak.current === 1) {
    return "1-day streak";
  }

  return `${streak.current}-day streak`;
};

export const getLongestDailyDraftPlayStreak = (
  mode: DailyDraftMode,
  playerId = getOrCreatePlayerId(),
): number => {
  const dateKeys = getCompletedDailyDraftDateKeys(mode, playerId);
  if (dateKeys.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < dateKeys.length; index += 1) {
    const previous = dateKeys[index - 1];
    const next = dateKeys[index];

    if (subtractDaysFromDateKey(next, 1) === previous) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }

    current = 1;
  }

  return longest;
};

const formatStreakDayCount = (days: number) =>
  days === 1 ? "1 day" : `${days} days`;

export const formatLongestStreakStat = (days: number) =>
  days > 0 ? formatStreakDayCount(days) : "—";

export const formatDailyDraftCareerLine = (
  daysPlayed: number,
  longestBasic: number,
  longestAdvanced: number,
) => {
  const dayPart = `${daysPlayed} day${daysPlayed === 1 ? "" : "s"} completed`;
  const streakParts: string[] = [];

  if (longestBasic > 0) {
    streakParts.push(`Basic ${formatStreakDayCount(longestBasic)}`);
  }
  if (longestAdvanced > 0) {
    streakParts.push(`Adv ${formatStreakDayCount(longestAdvanced)}`);
  }

  if (streakParts.length === 0) {
    return dayPart;
  }

  return `${dayPart} · Longest ${streakParts.join(" · ")}`;
};

/** Ensures today's completion is reflected when scores were just merged. */
export const hasPlayedDailyDraftOnDate = (
  mode: DailyDraftMode,
  dateKey: string,
  playerId = getOrCreatePlayerId(),
) =>
  loadDailyScoresForDate(dateKey, mode).some(
    (entry) => entry.playerId === playerId,
  );
