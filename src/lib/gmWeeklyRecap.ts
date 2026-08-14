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

const countDailyDaysInLastSeven = (playerId = getOrCreatePlayerId()) => {
  const today = getDailyDateKey();
  const store = readJson<DailyScoreStore>(DAILY_SCORES_KEY) ?? {};
  let count = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const dateKey = subtractDaysFromDateKey(today, offset);
    const entries = store[dateKey] ?? [];
    if (entries.some((entry) => entry.playerId === playerId)) {
      count += 1;
    }
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
  const careerWins =
    records.headToHead.wins + records.ranked.wins + records.allTime.wins;
  const careerLosses =
    records.headToHead.losses + records.ranked.losses + records.allTime.losses;
  const careerTies =
    records.headToHead.ties + records.ranked.ties + records.allTime.ties;

  return {
    weekKey: getWeeklyRecapWeekKey(),
    dailyDaysThisWeek: countDailyDaysInLastSeven(),
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
