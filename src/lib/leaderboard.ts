import { readJson, writeJson } from "./browserStorage";
import {
  MIN_GAMES_FOR_WIN_PCT,
  getWinPercentage,
  shouldShowWinPercentage,
} from "./playerRecord";

const LEADERBOARD_KEY = "nba-head-to-head-leaderboard";

export const LEADERBOARD_LIMIT = 100;

export interface LeaderboardEntry {
  playerId: string;
  city: string;
  name: string;
  wins: number;
  losses: number;
  lossStreak: number;
  updatedAt: string;
}

export type LeaderboardSort = "wins" | "winPct" | "lowestWinPct" | "lossStreak";

const normalizeEntry = (entry: LeaderboardEntry): LeaderboardEntry => ({
  playerId: entry.playerId,
  city: entry.city.trim(),
  name: entry.name.trim(),
  wins: Math.max(0, entry.wins),
  losses: Math.max(0, entry.losses),
  lossStreak: Math.max(0, entry.lossStreak ?? 0),
  updatedAt: entry.updatedAt,
});

export const loadLeaderboardEntries = (): LeaderboardEntry[] => {
  const entries = readJson<LeaderboardEntry[]>(LEADERBOARD_KEY);

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter(
      (entry) =>
        typeof entry.playerId === "string" &&
        typeof entry.city === "string" &&
        typeof entry.name === "string" &&
        typeof entry.wins === "number" &&
        typeof entry.losses === "number",
    )
    .map(normalizeEntry);
};

export const upsertLeaderboardEntry = (
  entry: Omit<LeaderboardEntry, "updatedAt">,
) => {
  const current = loadLeaderboardEntries();
  const nextEntry = normalizeEntry({
    ...entry,
    updatedAt: new Date().toISOString(),
  });
  const withoutCurrent = current.filter(
    (candidate) => candidate.playerId !== nextEntry.playerId,
  );

  writeJson(LEADERBOARD_KEY, [...withoutCurrent, nextEntry]);
};

export const formatLeaderboardTeam = (entry: Pick<LeaderboardEntry, "city" | "name">) =>
  `${entry.city} ${entry.name}`;

export const formatLeaderboardRecord = (
  entry: Pick<LeaderboardEntry, "wins" | "losses">,
) => `${entry.wins}-${entry.losses}`;

export const formatLeaderboardWinPercentage = (
  entry: Pick<LeaderboardEntry, "wins" | "losses">,
) => {
  if (!shouldShowWinPercentage(entry)) {
    return "—";
  }

  const winPct = getWinPercentage(entry);

  return winPct === null ? "—" : `${winPct.toFixed(1)}%`;
};

export const formatLeaderboardLossStreak = (
  entry: Pick<LeaderboardEntry, "lossStreak">,
) => (entry.lossStreak > 0 ? `${entry.lossStreak}` : "—");

const compareByWins = (left: LeaderboardEntry, right: LeaderboardEntry) =>
  right.wins - left.wins ||
  (getWinPercentage(right) ?? 0) - (getWinPercentage(left) ?? 0) ||
  left.name.localeCompare(right.name);

const compareByWinPct = (left: LeaderboardEntry, right: LeaderboardEntry) => {
  const leftEligible = shouldShowWinPercentage(left);
  const rightEligible = shouldShowWinPercentage(right);

  if (leftEligible !== rightEligible) {
    return leftEligible ? -1 : 1;
  }

  if (!leftEligible || !rightEligible) {
    return compareByWins(left, right);
  }

  return (
    (getWinPercentage(right) ?? 0) - (getWinPercentage(left) ?? 0) ||
    right.wins - left.wins ||
    left.name.localeCompare(right.name)
  );
};

const compareByLowestWinPct = (left: LeaderboardEntry, right: LeaderboardEntry) => {
  const leftEligible = shouldShowWinPercentage(left);
  const rightEligible = shouldShowWinPercentage(right);

  if (leftEligible !== rightEligible) {
    return leftEligible ? -1 : 1;
  }

  if (!leftEligible || !rightEligible) {
    return compareByWins(right, left);
  }

  return (
    (getWinPercentage(left) ?? 0) - (getWinPercentage(right) ?? 0) ||
    left.wins - right.wins ||
    left.name.localeCompare(right.name)
  );
};

const compareByLossStreak = (left: LeaderboardEntry, right: LeaderboardEntry) =>
  right.lossStreak - left.lossStreak ||
  right.losses - left.losses ||
  left.name.localeCompare(right.name);

const leaderboardSorters: Record<LeaderboardSort, typeof compareByWins> = {
  wins: compareByWins,
  winPct: compareByWinPct,
  lowestWinPct: compareByLowestWinPct,
  lossStreak: compareByLossStreak,
};

export const getTopLeaderboard = (
  sort: LeaderboardSort,
  limit = LEADERBOARD_LIMIT,
) => {
  const entries = loadLeaderboardEntries();

  return [...entries].sort(leaderboardSorters[sort]).slice(0, limit);
};

export const getLeaderboardFootnote = (sort: LeaderboardSort) => {
  switch (sort) {
    case "winPct":
      return `Win % appears after ${MIN_GAMES_FOR_WIN_PCT} games played. Showing top ${LEADERBOARD_LIMIT}.`;
    case "lowestWinPct":
      return `Win % appears after ${MIN_GAMES_FOR_WIN_PCT} games played. Showing bottom ${LEADERBOARD_LIMIT}.`;
    case "lossStreak":
      return `Showing top ${LEADERBOARD_LIMIT} by active loss streak.`;
    default:
      return `Showing top ${LEADERBOARD_LIMIT} by wins.`;
  }
};
