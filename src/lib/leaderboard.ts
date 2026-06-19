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
  name: string;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  updatedAt: string;
}

export type LeaderboardSort = "winStreak" | "winPct" | "lossStreak" | "lowestWinPct";

const normalizeEntry = (entry: LeaderboardEntry): LeaderboardEntry => ({
  playerId: entry.playerId,
  name: entry.name.trim(),
  wins: Math.max(0, entry.wins),
  losses: Math.max(0, entry.losses),
  winStreak: Math.max(0, entry.winStreak ?? 0),
  lossStreak: Math.max(0, entry.lossStreak ?? 0),
  updatedAt: entry.updatedAt,
});

type StoredLeaderboardEntry = LeaderboardEntry & { city?: string };

export const loadLeaderboardEntries = (): LeaderboardEntry[] => {
  const entries = readJson<StoredLeaderboardEntry[]>(LEADERBOARD_KEY);

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter(
      (entry) =>
        typeof entry.playerId === "string" &&
        (typeof entry.name === "string" || typeof entry.city === "string") &&
        typeof entry.wins === "number" &&
        typeof entry.losses === "number",
    )
    .map((entry) =>
      normalizeEntry({
        playerId: entry.playerId,
        name: entry.name?.trim() || entry.city?.trim() || "",
        wins: entry.wins,
        losses: entry.losses,
        winStreak: entry.winStreak ?? 0,
        lossStreak: entry.lossStreak ?? 0,
        updatedAt: entry.updatedAt ?? new Date().toISOString(),
      }),
    );
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

export const formatLeaderboardTeam = (entry: Pick<LeaderboardEntry, "name">) =>
  entry.name;

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

export const formatLeaderboardWinStreak = (
  entry: Pick<LeaderboardEntry, "winStreak">,
) => (entry.winStreak > 0 ? `${entry.winStreak}` : "—");

const compareByWinStreak = (left: LeaderboardEntry, right: LeaderboardEntry) =>
  right.winStreak - left.winStreak ||
  right.wins - left.wins ||
  left.name.localeCompare(right.name);

const compareByWinPct = (left: LeaderboardEntry, right: LeaderboardEntry) => {
  const leftEligible = shouldShowWinPercentage(left);
  const rightEligible = shouldShowWinPercentage(right);

  if (leftEligible !== rightEligible) {
    return leftEligible ? -1 : 1;
  }

  if (!leftEligible || !rightEligible) {
    return compareByWinStreak(left, right);
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
    return compareByWinStreak(right, left);
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

const leaderboardSorters: Record<LeaderboardSort, typeof compareByWinStreak> = {
  winStreak: compareByWinStreak,
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
      return `Showing top ${LEADERBOARD_LIMIT} by active win streak.`;
  }
};
