import { readJson, writeJson } from "./browserStorage";
import { getDailyDateKey, subtractDaysFromDateKey } from "./dailyDraft";
import {
  formatDailyDraftPlayStreak,
  getDailyDraftPlayStreak,
} from "./dailyDraftPlayStreak";
import { getUnlockedFrontOfficeBadges } from "./frontOfficeBadges";
import { loadGmLegacyStats } from "./gmLegacyStats";
import { getCollectionProgress } from "./playerCollection";
import { formatPlayerRecord, loadAllModeRecords, getOrCreatePlayerId } from "./playerRecord";
import { getRankedProfileView } from "./rankedProfile";

const WEEKLY_RECAP_SEEN_KEY = "ddgm:weekly-recap-seen";
const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";

type DailyScoreStore = Record<
  string,
  Array<{ playerId: string }>
>;

type WeeklyRecapSeenStore = Record<string, boolean>;

const loadSeenStore = (): WeeklyRecapSeenStore =>
  readJson<WeeklyRecapSeenStore>(WEEKLY_RECAP_SEEN_KEY) ?? {};

const saveSeenStore = (store: WeeklyRecapSeenStore) => {
  writeJson(WEEKLY_RECAP_SEEN_KEY, store);
};

/** Monday date key for the week containing `date`. */
export const getWeeklyRecapWeekKey = (date = new Date()) => {
  const today = getDailyDateKey(date);
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return subtractDaysFromDateKey(today, daysSinceMonday);
};

/** Count distinct calendar days with a Daily score from weekKey through today (in-week). */
export const countDailyDaysThisWeek = (
  playerId = getOrCreatePlayerId(),
  weekKey = getWeeklyRecapWeekKey(),
) => {
  const today = getDailyDateKey();
  const weekEnd = subtractDaysFromDateKey(weekKey, -6);
  const endKey = today < weekEnd ? today : weekEnd;
  const store = readJson<DailyScoreStore>(DAILY_SCORES_KEY) ?? {};
  let count = 0;
  let cursor = weekKey;

  while (cursor <= endKey) {
    const entries = store[cursor] ?? [];
    if (entries.some((entry) => entry.playerId === playerId)) {
      count += 1;
    }
    if (cursor === endKey) {
      break;
    }
    cursor = subtractDaysFromDateKey(cursor, -1);
  }

  return count;
};

const formatBestStreakLabel = () => {
  const asOf = getDailyDateKey();
  const basic = getDailyDraftPlayStreak("basic", asOf);
  const advanced = getDailyDraftPlayStreak("advanced", asOf);
  const best =
    advanced.current >= basic.current
      ? { label: "Advanced", streak: advanced }
      : { label: "Basic", streak: basic };

  if (best.streak.current <= 0) {
    return "No active streak";
  }

  return `${best.label}: ${formatDailyDraftPlayStreak(best.streak)}`;
};

export interface WeeklyGmRecap {
  weekKey: string;
  dailyDaysThisWeek: number;
  bestStreakLabel: string;
  collectionUnlocked: number;
  collectionTotal: number;
  frontOfficeBadgesUnlocked: number;
  careerH2hRecord: string;
}

export const buildWeeklyGmRecap = (): WeeklyGmRecap => {
  const collection = getCollectionProgress();
  const records = loadAllModeRecords();
  const legacy = loadGmLegacyStats();
  const ranked = getRankedProfileView();
  const peakElo = Math.max(legacy.peakElo, ranked.peakElo);
  const careerWins = records.headToHead.wins + records.ranked.wins;
  const careerLosses = records.headToHead.losses + records.ranked.losses;
  const careerTies = records.headToHead.ties + records.ranked.ties;
  const weekKey = getWeeklyRecapWeekKey();

  return {
    weekKey,
    dailyDaysThisWeek: countDailyDaysThisWeek(undefined, weekKey),
    bestStreakLabel: formatBestStreakLabel(),
    collectionUnlocked: collection.unlocked,
    collectionTotal: collection.total,
    frontOfficeBadgesUnlocked: getUnlockedFrontOfficeBadges(peakElo).length,
    careerH2hRecord: formatPlayerRecord({
      wins: careerWins,
      losses: careerLosses,
      ties: careerTies,
    }),
  };
};

export const hasSeenWeeklyRecap = (weekKey: string) =>
  Boolean(loadSeenStore()[weekKey]);

export const markWeeklyRecapSeen = (weekKey: string) => {
  const store = loadSeenStore();
  store[weekKey] = true;
  saveSeenStore(store);
};
