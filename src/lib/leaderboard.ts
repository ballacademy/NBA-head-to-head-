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
  updatedAt: string;
}

export type LeaderboardSort = "wins" | "winPct";

const normalizeEntry = (entry: LeaderboardEntry): LeaderboardEntry => ({
  playerId: entry.playerId,
  city: entry.city.trim(),
  name: entry.name.trim(),
  wins: Math.max(0, entry.wins),
  losses: Math.max(0, entry.losses),
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

export const getTopLeaderboard = (
  sort: LeaderboardSort,
  limit = LEADERBOARD_LIMIT,
) => {
  const entries = loadLeaderboardEntries();
  const sorter = sort === "wins" ? compareByWins : compareByWinPct;

  return [...entries].sort(sorter).slice(0, limit);
};

export const getLeaderboardFootnote = (sort: LeaderboardSort) =>
  sort === "winPct"
    ? `Win % appears after ${MIN_GAMES_FOR_WIN_PCT} games played. Showing top ${LEADERBOARD_LIMIT}.`
    : `Showing top ${LEADERBOARD_LIMIT} by wins.`;
