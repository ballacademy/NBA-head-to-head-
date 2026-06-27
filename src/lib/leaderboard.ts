import { readJson, writeJson } from "./browserStorage";
import { formatGmDisplayName, resolvePublicTag } from "./playerIdentity";
import {
  RANKED_STARTING_ELO,
  RATING_LABEL,
  formatRankedElo,
  getTierForElo,
} from "./rankedElo";

const LEADERBOARD_KEY = "nba-head-to-head-leaderboard";

export const LEADERBOARD_LIMIT = 100;

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  publicTag: string;
  elo: number;
  tierLabel: string;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  updatedAt: string;
}

export type LeaderboardSort = "elo" | "winStreak" | "lossStreak";

const normalizeEntry = (entry: LeaderboardEntry): LeaderboardEntry => {
  const elo = Math.max(0, Math.round(entry.elo ?? RANKED_STARTING_ELO));

  return {
    playerId: entry.playerId,
    name: entry.name.trim(),
    publicTag: resolvePublicTag(entry.playerId, entry.publicTag),
    elo,
    tierLabel: getTierForElo(elo).label,
    wins: Math.max(0, entry.wins),
    losses: Math.max(0, entry.losses),
    winStreak: Math.max(0, entry.winStreak ?? 0),
    lossStreak: Math.max(0, entry.lossStreak ?? 0),
    updatedAt: entry.updatedAt,
  };
};

type StoredLeaderboardEntry = Omit<LeaderboardEntry, "publicTag" | "elo" | "tierLabel"> & {
  city?: string;
  publicTag?: string;
  elo?: number;
  tierLabel?: string;
};

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
        publicTag: resolvePublicTag(entry.playerId, entry.publicTag),
        elo: entry.elo ?? RANKED_STARTING_ELO,
        tierLabel: entry.tierLabel ?? getTierForElo(entry.elo ?? RANKED_STARTING_ELO).label,
        wins: entry.wins,
        losses: entry.losses,
        winStreak: entry.winStreak ?? 0,
        lossStreak: entry.lossStreak ?? 0,
        updatedAt: entry.updatedAt ?? new Date().toISOString(),
      }),
    );
};

export const upsertLeaderboardEntry = (
  entry: Omit<LeaderboardEntry, "updatedAt" | "publicTag" | "tierLabel"> & {
    publicTag?: string;
    tierLabel?: string;
  },
) => {
  const current = loadLeaderboardEntries();
  const nextEntry = normalizeEntry({
    ...entry,
    publicTag: resolvePublicTag(entry.playerId, entry.publicTag),
    tierLabel: entry.tierLabel ?? getTierForElo(entry.elo).label,
    updatedAt: new Date().toISOString(),
  });
  const withoutCurrent = current.filter(
    (candidate) => candidate.playerId !== nextEntry.playerId,
  );

  writeJson(LEADERBOARD_KEY, [...withoutCurrent, nextEntry]);
};

export const formatLeaderboardTeam = (
  entry: Pick<LeaderboardEntry, "name" | "publicTag">,
) => formatGmDisplayName(entry.name, entry.publicTag);

export const formatLeaderboardRecord = (
  entry: Pick<LeaderboardEntry, "wins" | "losses">,
) => `${entry.wins}-${entry.losses}`;

export const formatLeaderboardElo = (entry: Pick<LeaderboardEntry, "elo">) =>
  formatRankedElo(entry.elo);

export const formatLeaderboardLossStreak = (
  entry: Pick<LeaderboardEntry, "lossStreak">,
) => (entry.lossStreak > 0 ? `${entry.lossStreak}` : "—");

export const formatLeaderboardWinStreak = (
  entry: Pick<LeaderboardEntry, "winStreak">,
) => (entry.winStreak > 0 ? `${entry.winStreak}` : "—");

const compareByElo = (left: LeaderboardEntry, right: LeaderboardEntry) =>
  right.elo - left.elo ||
  right.wins - left.wins ||
  left.name.localeCompare(right.name);

const compareByWinStreak = (left: LeaderboardEntry, right: LeaderboardEntry) =>
  right.winStreak - left.winStreak ||
  right.wins - left.wins ||
  left.name.localeCompare(right.name);

const compareByLossStreak = (left: LeaderboardEntry, right: LeaderboardEntry) =>
  right.lossStreak - left.lossStreak ||
  right.losses - left.losses ||
  left.name.localeCompare(right.name);

const leaderboardSorters: Record<LeaderboardSort, typeof compareByElo> = {
  elo: compareByElo,
  winStreak: compareByWinStreak,
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
    case "elo":
      return `Showing top ${LEADERBOARD_LIMIT} by ${RATING_LABEL}.`;
    case "lossStreak":
      return `Showing top ${LEADERBOARD_LIMIT} by active loss streak.`;
    default:
      return `Showing top ${LEADERBOARD_LIMIT} by active win streak.`;
  }
};
