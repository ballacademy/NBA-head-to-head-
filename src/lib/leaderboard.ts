import { readJson, writeJson } from "./browserStorage";
import {
  getCachedRemoteLeaderboard,
  syncLeaderboardEntryToApi,
} from "./leaderboardRemote";
import { formatGmDisplayName, resolvePublicTag } from "./playerIdentity";
import { CLASSIC_LEADERBOARD_LABEL } from "./modeLabels";
import {
  RANKED_STARTING_ELO,
  RATING_LABEL,
  formatRankedElo,
  getTierForElo,
} from "./rankedElo";
import { formatSeasonLabel, getCurrentSeasonId } from "./rankedSeason";

const LEADERBOARD_KEY = "nba-head-to-head-leaderboard";

export const LEADERBOARD_LIMIT = 500;

export interface LeaderboardEntry {
  playerId: string;
  isYou?: boolean;
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

interface StoredClassicLeaderboard {
  seasonId: string;
  entries: StoredLeaderboardEntry[];
}

const normalizeEntry = (entry: LeaderboardEntry): LeaderboardEntry => {
  const elo = Math.max(0, Math.round(entry.elo ?? RANKED_STARTING_ELO));

  return {
    playerId: entry.playerId,
    isYou: entry.isYou,
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

type StoredLeaderboardEntry = Omit<
  LeaderboardEntry,
  "publicTag" | "elo" | "tierLabel"
> & {
  city?: string;
  publicTag?: string;
  elo?: number;
  tierLabel?: string;
};

const parseStoredEntries = (
  entries: StoredLeaderboardEntry[] | null | undefined,
): LeaderboardEntry[] => {
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
        tierLabel:
          entry.tierLabel ??
          getTierForElo(entry.elo ?? RANKED_STARTING_ELO).label,
        wins: entry.wins,
        losses: entry.losses,
        winStreak: entry.winStreak ?? 0,
        lossStreak: entry.lossStreak ?? 0,
        updatedAt: entry.updatedAt ?? new Date().toISOString(),
      }),
    );
};

const readStoredLeaderboard = (): StoredClassicLeaderboard | null => {
  const stored = readJson<StoredClassicLeaderboard | StoredLeaderboardEntry[]>(
    LEADERBOARD_KEY,
  );

  if (!stored) {
    return null;
  }

  // Legacy flat array (pre-monthly seasons) — treat as expired for the new season.
  if (Array.isArray(stored)) {
    return null;
  }

  if (
    typeof stored !== "object" ||
    typeof stored.seasonId !== "string" ||
    !Array.isArray(stored.entries)
  ) {
    return null;
  }

  return {
    seasonId: stored.seasonId,
    entries: stored.entries,
  };
};

const saveLeaderboard = (seasonId: string, entries: LeaderboardEntry[]) => {
  writeJson(LEADERBOARD_KEY, {
    seasonId,
    entries,
  } satisfies StoredClassicLeaderboard);
};

export const loadLeaderboardEntries = (): LeaderboardEntry[] => {
  const seasonId = getCurrentSeasonId();
  const stored = readStoredLeaderboard();

  if (!stored || stored.seasonId !== seasonId) {
    saveLeaderboard(seasonId, []);
    return [];
  }

  return parseStoredEntries(stored.entries);
};

export const upsertLeaderboardEntry = (
  entry: Omit<LeaderboardEntry, "updatedAt" | "publicTag" | "tierLabel"> & {
    publicTag?: string;
    tierLabel?: string;
  },
) => {
  const seasonId = getCurrentSeasonId();
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
  const merged = [...withoutCurrent, nextEntry]
    .sort(
      (left, right) =>
        right.elo - left.elo ||
        right.wins - left.wins ||
        left.name.localeCompare(right.name),
    )
    .slice(0, LEADERBOARD_LIMIT);

  saveLeaderboard(seasonId, merged);
  syncLeaderboardEntryToApi({
    mode: "classic",
    seasonId,
    playerId: nextEntry.playerId,
    teamName: nextEntry.name,
    publicTag: nextEntry.publicTag,
    elo: nextEntry.elo,
    wins: nextEntry.wins,
    losses: nextEntry.losses,
    winStreak: nextEntry.winStreak,
    lossStreak: nextEntry.lossStreak,
  });
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
  const seasonId = getCurrentSeasonId();
  const remoteEntries = getCachedRemoteLeaderboard("classic", sort, seasonId);

  if (remoteEntries && remoteEntries.length > 0) {
    return remoteEntries
      .map((entry) =>
        normalizeEntry({
          ...entry,
          tierLabel: getTierForElo(entry.elo).label,
        }),
      )
      .slice(0, limit);
  }

  const entries = loadLeaderboardEntries();

  return [...entries].sort(leaderboardSorters[sort]).slice(0, limit);
};

export const getLeaderboardFootnote = (
  sort: LeaderboardSort,
  seasonId = getCurrentSeasonId(),
) => {
  const seasonNote = `${CLASSIC_LEADERBOARD_LABEL} for ${formatSeasonLabel(seasonId)}. Real front offices only — ratings reset at the start of each calendar month.`;

  switch (sort) {
    case "winStreak":
      return `${seasonNote} Sorted by active win streak.`;
    case "lossStreak":
      return `${seasonNote} Sorted by active loss streak.`;
    default:
      return `${seasonNote} Sorted by ${RATING_LABEL}.`;
  }
};
