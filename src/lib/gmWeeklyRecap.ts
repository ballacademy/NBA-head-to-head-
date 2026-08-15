import { readJson, writeJson } from "./browserStorage";
import { getClassicProfileView } from "./classicProfile";
import { getDailyDateKey, subtractDaysFromDateKey } from "./dailyDraft";
import {
  formatDailyDraftPlayStreak,
  getDailyDraftPlayStreak,
} from "./dailyDraftPlayStreak";
import {
  formatDailyDraftModeLabel,
  getDailyDraftModeForGoalId,
  type DailyDraftMode,
} from "./dailyDraftMode";
import { getUnlockedFrontOfficeBadges } from "./frontOfficeBadges";
import { loadGmLegacyStats } from "./gmLegacyStats";
import { formatOrdinal } from "./ordinal";
import { getCollectionProgress } from "./playerCollection";
import {
  formatPlayerRecord,
  loadAllModeRecords,
  getOrCreatePlayerId,
} from "./playerRecord";
import { formatRatingPoints } from "./rankedElo";
import { getRankedProfileView } from "./rankedProfile";

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

const formatStreakLabel = (mode: DailyDraftMode) => {
  const streak = getDailyDraftPlayStreak(mode, getDailyDateKey());
  if (streak.current <= 0) {
    return "No active streak";
  }
  return formatDailyDraftPlayStreak(streak);
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
  dailyDaysThisWeek: number;
  dailyDaysSplitLabel: string;
  bestDailyFinishLabel: string;
  basicStreakLabel: string;
  advancedStreakLabel: string;
  collectionUnlocked: number;
  collectionTotal: number;
  frontOfficeBadgesUnlocked: number;
  casualRecord: string;
  casualBannersLabel: string;
  proRecord: string;
  proBannersLabel: string;
}

export const buildWeeklyGmRecap = (): WeeklyGmRecap => {
  const collection = getCollectionProgress();
  const records = loadAllModeRecords();
  const legacy = loadGmLegacyStats();
  const classic = getClassicProfileView();
  const ranked = getRankedProfileView();
  const peakElo = Math.max(legacy.peakElo, classic.peakElo, ranked.peakElo);
  const weekKey = getWeeklyRecapWeekKey();
  const modeDays = countDailyModeDaysThisWeek(undefined, weekKey);
  const bestPercentile = getBestDailyPercentileThisWeek(undefined, weekKey);

  return {
    weekKey,
    dailyDaysThisWeek: countDailyDaysThisWeek(undefined, weekKey),
    dailyDaysSplitLabel: formatDailyDaysSplitLabel(
      modeDays.basic,
      modeDays.advanced,
    ),
    bestDailyFinishLabel: formatBestDailyFinishLabel(bestPercentile),
    basicStreakLabel: formatStreakLabel("basic"),
    advancedStreakLabel: formatStreakLabel("advanced"),
    collectionUnlocked: collection.unlocked,
    collectionTotal: collection.total,
    frontOfficeBadgesUnlocked: getUnlockedFrontOfficeBadges(peakElo).length,
    casualRecord: formatPlayerRecord({
      wins: records.headToHead.wins,
      losses: records.headToHead.losses,
      ties: records.headToHead.ties,
    }),
    casualBannersLabel: formatRatingPoints(classic.elo),
    proRecord: formatPlayerRecord({
      wins: records.ranked.wins,
      losses: records.ranked.losses,
      ties: records.ranked.ties,
    }),
    proBannersLabel: formatRatingPoints(ranked.elo),
  };
};

export const hasSeenWeeklyRecap = (weekKey: string) =>
  Boolean(loadSeenStore()[weekKey]);

export const markWeeklyRecapSeen = (weekKey: string) => {
  const store = loadSeenStore();
  store[weekKey] = true;
  saveSeenStore(store);
};
