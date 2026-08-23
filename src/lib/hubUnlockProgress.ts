import { readJson } from "./browserStorage";
import { loadEventProfilesPayload } from "./eventProfile";
import {
  getGamesPlayed,
  loadAllModeRecords,
} from "./playerRecord";
import { getOrCreatePlayerIdentity } from "./playerIdentity";

export type HubNavTab =
  | "play"
  | "roster"
  | "community"
  | "standings"
  | "account";

const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";

/** Franchise tab unlocks after one scored experience (Daily or competitive match). */
export const FRANCHISE_UNLOCK_SCORED_GAMES = 1;

/** Ranks tab unlocks after two competitive matches (Daily alone is not enough). */
export const RANKS_UNLOCK_COMPETITIVE_GAMES = 2;

export interface HubUnlockProgress {
  dailyScoredGames: number;
  competitiveMatchGames: number;
  totalScoredGames: number;
  franchiseUnlocked: boolean;
  ranksUnlocked: boolean;
  playModesExpanded: boolean;
  franchiseGamesRemaining: number;
  ranksGamesRemaining: number;
}

const isUsableDailyEntry = (entry: unknown): entry is {
  playerId: string;
  goalId: string;
  value: number;
  formattedResult: string;
} =>
  Boolean(
    entry &&
      typeof entry === "object" &&
      typeof (entry as { playerId?: unknown }).playerId === "string" &&
      (entry as { playerId: string }).playerId.length > 0 &&
      typeof (entry as { goalId?: unknown }).goalId === "string" &&
      typeof (entry as { value?: unknown }).value === "number" &&
      Number.isFinite((entry as { value: number }).value) &&
      typeof (entry as { formattedResult?: unknown }).formattedResult ===
        "string",
  );

export const countDailyScoredGames = (
  playerId = getOrCreatePlayerIdentity().playerId,
): number => {
  const store = readJson<Record<string, unknown[]>>(DAILY_SCORES_KEY);
  if (!store || typeof store !== "object") {
    return 0;
  }

  let count = 0;
  for (const entries of Object.values(store)) {
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      if (isUsableDailyEntry(entry) && entry.playerId === playerId) {
        count += 1;
      }
    }
  }

  return count;
};

export const countCompetitiveMatchGames = (): number => {
  const records = loadAllModeRecords();
  const eventMatches = Object.values(loadEventProfilesPayload().byEventId).reduce(
    (sum, profile) => sum + Math.max(0, profile.matchesPlayed),
    0,
  );

  return (
    getGamesPlayed(records.headToHead) +
    getGamesPlayed(records.ranked) +
    getGamesPlayed(records.allTime) +
    eventMatches
  );
};

export const getHubUnlockProgress = (): HubUnlockProgress => {
  const dailyScoredGames = countDailyScoredGames();
  const competitiveMatchGames = countCompetitiveMatchGames();
  const totalScoredGames = dailyScoredGames + competitiveMatchGames;
  const franchiseUnlocked = totalScoredGames >= FRANCHISE_UNLOCK_SCORED_GAMES;
  const ranksUnlocked =
    competitiveMatchGames >= RANKS_UNLOCK_COMPETITIVE_GAMES;

  return {
    dailyScoredGames,
    competitiveMatchGames,
    totalScoredGames,
    franchiseUnlocked,
    ranksUnlocked,
    playModesExpanded: franchiseUnlocked,
    franchiseGamesRemaining: Math.max(
      0,
      FRANCHISE_UNLOCK_SCORED_GAMES - totalScoredGames,
    ),
    ranksGamesRemaining: Math.max(
      0,
      RANKS_UNLOCK_COMPETITIVE_GAMES - competitiveMatchGames,
    ),
  };
};

export type HubTabLockKind = "franchise" | "ranks";

export interface HubTabLockPrompt {
  tab: HubNavTab;
  kind: HubTabLockKind;
  progress: HubUnlockProgress;
}

export const getHubTabLockPrompt = (
  tab: HubNavTab,
  progress = getHubUnlockProgress(),
): HubTabLockPrompt | null => {
  if (tab === "roster" && !progress.franchiseUnlocked) {
    return { tab, kind: "franchise", progress };
  }

  if (tab === "standings" && !progress.ranksUnlocked) {
    return { tab, kind: "ranks", progress };
  }

  return null;
};

export const isHubTabUnlocked = (
  tab: HubNavTab,
  progress = getHubUnlockProgress(),
) => getHubTabLockPrompt(tab, progress) == null;

/** Feature pages that live under Franchise / Ranks must respect the same gates. */
export const getFeatureLockPrompt = (
  feature:
    | "leaderboard"
    | "stats"
    | "achievements"
    | "gmStats"
    | "weeklyRecap"
    | "tierList"
    | "gameLog"
    | "privacy"
    | "terms"
    | "beta"
    | string,
  progress = getHubUnlockProgress(),
): HubTabLockPrompt | null => {
  if (feature === "leaderboard") {
    return getHubTabLockPrompt("standings", progress);
  }

  if (
    feature === "stats" ||
    feature === "achievements" ||
    feature === "gmStats" ||
    feature === "weeklyRecap"
  ) {
    return getHubTabLockPrompt("roster", progress);
  }

  return null;
};

export const hubTabLockStates = (
  progress = getHubUnlockProgress(),
): Partial<Record<HubNavTab, true>> => {
  const locked: Partial<Record<HubNavTab, true>> = {};
  if (!progress.franchiseUnlocked) {
    locked.roster = true;
  }
  if (!progress.ranksUnlocked) {
    locked.standings = true;
  }
  return locked;
};

export const formatHubUnlockProgressLabel = (progress: HubUnlockProgress) => {
  if (!progress.franchiseUnlocked) {
    return progress.franchiseGamesRemaining === 1
      ? "1 scored game to unlock Franchise"
      : `${progress.franchiseGamesRemaining} scored games to unlock Franchise`;
  }

  if (!progress.ranksUnlocked) {
    return progress.ranksGamesRemaining === 1
      ? "1 competitive match to unlock Ranks"
      : `${progress.ranksGamesRemaining} competitive matches to unlock Ranks`;
  }

  return null;
};
