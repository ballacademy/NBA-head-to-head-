import { readJson, writeJson } from "./browserStorage";
import { initialDrafterBlueprints } from "../data/drafterBlueprints";
import {
  getCachedRemoteLeaderboard,
  syncLeaderboardEntryToApi,
} from "./leaderboardRemote";
import { recordLocalGmLegacySnapshot } from "./gmLegacyStats";
import { derivePublicTag, resolvePublicTag } from "./playerIdentity";
import { RATING_LABEL, formatRankedElo, getTierForElo } from "./rankedElo";
import { PRO_LEADERBOARD_LABEL } from "./modeLabels";
import { getCurrentSeasonId, formatSeasonLabel } from "./rankedSeason";

const RANKED_LEADERBOARD_KEY = "nba-head-to-head-ranked-leaderboard";
const NPC_OPPONENT_POOL_KEY = "nba-head-to-head-ranked-npc-pool";

export const RANKED_LEADERBOARD_LIMIT = 500;
const NPC_POOL_SIZE = RANKED_LEADERBOARD_LIMIT - 1;

export interface RankedLeaderboardEntry {
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
  isNpc?: boolean;
  updatedAt: string;
}

export type RankedLeaderboardSort = "elo" | "winStreak" | "lossStreak";

interface StoredRankedLeaderboard {
  seasonId: string;
  entries: RankedLeaderboardEntry[];
}

interface StoredNpcOpponentPool {
  seasonId: string;
  entries: RankedLeaderboardEntry[];
}

const NPC_FIRST_NAMES = [
  "Mira",
  "Diego",
  "Amina",
  "Noah",
  "Hana",
  "Kai",
  "Zara",
  "Mateo",
  "Jordan",
  "Riley",
  "Casey",
  "Morgan",
  "Quinn",
  "Avery",
  "Harper",
  "Ellis",
  "Reese",
  "Sloane",
  "Drew",
  "Blake",
] as const;

const NPC_OFFICE_SUFFIXES = [
  "Front Office",
  "War Room",
  "Cap Desk",
  "Draft HQ",
  "Analytics Lab",
  "Scouting Dept",
  "Basketball Ops",
  "GM Suite",
] as const;

const NPC_CITIES = [
  ...initialDrafterBlueprints.map((blueprint) => blueprint.city),
  "Chicago",
  "Boston",
  "Phoenix",
  "Denver",
  "Miami",
  "Dallas",
  "Milwaukee",
  "Cleveland",
  "Portland",
  "Sacramento",
  "Atlanta",
  "Detroit",
  "Orlando",
  "Minneapolis",
  "Brooklyn",
  "Philadelphia",
  "Memphis",
  "Charlotte",
  "Indianapolis",
  "Salt Lake City",
  "New Orleans",
  "Oklahoma City",
  "San Antonio",
  "Houston",
  "Los Angeles",
  "New York",
] as const;

const hashSeasonSeed = (seasonId: string) => {
  let hash = 2166136261;

  for (const char of seasonId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createSeasonRandom = (seasonId: string) => {
  let state = hashSeasonSeed(seasonId) || 1;

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;

    return state / 0x100000000;
  };
};

const pickFrom = <T,>(values: readonly T[], random: () => number) =>
  values[Math.floor(random() * values.length)]!;

const buildNpcName = (index: number, random: () => number) => {
  const city = pickFrom(NPC_CITIES, random);
  const firstName = pickFrom(NPC_FIRST_NAMES, random);
  const suffix = pickFrom(NPC_OFFICE_SUFFIXES, random);

  return `${city} ${suffix} #${index + 1}`;
};

const buildNpcElo = (index: number, random: () => number) => {
  const percentile = index / NPC_POOL_SIZE;
  const base = 350 + percentile * 1750;
  const jitter = (random() - 0.5) * 180;

  return Math.max(250, Math.min(2450, Math.round(base + jitter)));
};

export const seedNpcLeaderboardEntries = (
  seasonId: string,
): RankedLeaderboardEntry[] => {
  const random = createSeasonRandom(seasonId);
  const timestamp = new Date().toISOString();

  return Array.from({ length: NPC_POOL_SIZE }, (_, index) => {
    const elo = buildNpcElo(index, random);
    const tier = getTierForElo(elo);
    const games = 12 + Math.floor(random() * 40);
    const winRate = 0.35 + random() * 0.35;
    const wins = Math.round(games * winRate);
    const losses = Math.max(0, games - wins);
    const onWinStreak = random() > 0.45;
    const streakLength = onWinStreak
      ? Math.floor(random() * 8)
      : Math.floor(random() * 6);

    return {
      playerId: `npc-${seasonId}-${index}`,
      name: buildNpcName(index, random),
      publicTag: derivePublicTag(`npc-${seasonId}-${index}`),
      elo,
      tierLabel: tier.label,
      wins,
      losses,
      winStreak: onWinStreak ? streakLength : 0,
      lossStreak: onWinStreak ? 0 : streakLength,
      isNpc: true,
      updatedAt: timestamp,
    };
  });
};

const normalizeEntry = (entry: RankedLeaderboardEntry): RankedLeaderboardEntry => {
  const elo = Math.max(0, Math.round(entry.elo));

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
    isNpc: entry.isNpc ?? false,
    updatedAt: entry.updatedAt,
  };
};

const loadStoredLeaderboard = (): StoredRankedLeaderboard | null => {
  const stored = readJson<StoredRankedLeaderboard>(RANKED_LEADERBOARD_KEY);

  if (!stored || typeof stored.seasonId !== "string" || !Array.isArray(stored.entries)) {
    return null;
  }

  return {
    seasonId: stored.seasonId,
    entries: stored.entries
      .filter((entry) => !entry.isNpc)
      .map(normalizeEntry),
  };
};

const loadStoredNpcPool = (): StoredNpcOpponentPool | null => {
  const stored = readJson<StoredNpcOpponentPool>(NPC_OPPONENT_POOL_KEY);

  if (!stored || typeof stored.seasonId !== "string" || !Array.isArray(stored.entries)) {
    return null;
  }

  return stored;
};

const saveLeaderboard = (seasonId: string, entries: RankedLeaderboardEntry[]) => {
  writeJson(RANKED_LEADERBOARD_KEY, {
    seasonId,
    entries: entries
      .filter((entry) => !entry.isNpc)
      .map(normalizeEntry),
  } satisfies StoredRankedLeaderboard);
};

const saveNpcPool = (seasonId: string, entries: RankedLeaderboardEntry[]) => {
  writeJson(NPC_OPPONENT_POOL_KEY, {
    seasonId,
    entries: entries.map(normalizeEntry),
  } satisfies StoredNpcOpponentPool);
};

export const loadRankedLeaderboardEntries = (): RankedLeaderboardEntry[] => {
  const seasonId = getCurrentSeasonId();
  const stored = loadStoredLeaderboard();

  if (stored?.seasonId === seasonId) {
    return stored.entries.map(normalizeEntry);
  }

  saveLeaderboard(seasonId, []);
  return [];
};

export const ensureNpcOpponentPool = (): RankedLeaderboardEntry[] => {
  const seasonId = getCurrentSeasonId();
  const stored = loadStoredNpcPool();

  if (stored?.seasonId === seasonId) {
    return stored.entries.map(normalizeEntry);
  }

  const entries = seedNpcLeaderboardEntries(seasonId);
  saveNpcPool(seasonId, entries);

  return entries;
};

/** @deprecated Use loadRankedLeaderboardEntries for display or ensureNpcOpponentPool for NPC matching. */
export const ensureRankedLeaderboard = (): RankedLeaderboardEntry[] =>
  loadRankedLeaderboardEntries();

const compareByElo = (
  left: RankedLeaderboardEntry,
  right: RankedLeaderboardEntry,
) =>
  right.elo - left.elo ||
  right.wins - left.wins ||
  left.name.localeCompare(right.name);

const compareByWinStreak = (
  left: RankedLeaderboardEntry,
  right: RankedLeaderboardEntry,
) =>
  right.winStreak - left.winStreak ||
  right.wins - left.wins ||
  left.name.localeCompare(right.name);

const compareByLossStreak = (
  left: RankedLeaderboardEntry,
  right: RankedLeaderboardEntry,
) =>
  right.lossStreak - left.lossStreak ||
  right.losses - left.losses ||
  left.name.localeCompare(right.name);

const rankedLeaderboardSorters: Record<
  RankedLeaderboardSort,
  typeof compareByElo
> = {
  elo: compareByElo,
  winStreak: compareByWinStreak,
  lossStreak: compareByLossStreak,
};

export const getTopRankedLeaderboard = (
  sort: RankedLeaderboardSort = "elo",
  limit = RANKED_LEADERBOARD_LIMIT,
): RankedLeaderboardEntry[] => {
  const seasonId = getCurrentSeasonId();
  const remoteEntries = getCachedRemoteLeaderboard("ranked", sort, seasonId);

  if (remoteEntries && remoteEntries.length > 0) {
    return remoteEntries
      .map((entry) =>
        normalizeEntry({
          ...entry,
          tierLabel: getTierForElo(entry.elo).label,
          isNpc: false,
        }),
      )
      .slice(0, limit);
  }

  return [...loadRankedLeaderboardEntries()]
    .sort(rankedLeaderboardSorters[sort])
    .slice(0, limit);
};

export const upsertRankedLeaderboardEntry = (
  entry: Omit<RankedLeaderboardEntry, "tierLabel" | "updatedAt" | "publicTag"> & {
    publicTag?: string;
  },
) => {
  const seasonId = getCurrentSeasonId();
  const current = loadRankedLeaderboardEntries().filter(
    (candidate) => candidate.playerId !== entry.playerId,
  );
  const nextEntry = normalizeEntry({
    ...entry,
    publicTag: resolvePublicTag(entry.playerId, entry.publicTag),
    tierLabel: getTierForElo(entry.elo).label,
    updatedAt: new Date().toISOString(),
    isNpc: false,
  });

  const merged = [...current, nextEntry].sort(compareByElo);
  const limited = merged.slice(0, RANKED_LEADERBOARD_LIMIT);
  saveLeaderboard(seasonId, limited);

  const monthlyRank =
    limited.findIndex((candidate) => candidate.playerId === entry.playerId) + 1;

  recordLocalGmLegacySnapshot({
    elo: nextEntry.elo,
    seasonId,
    monthlyRank: monthlyRank > 0 ? monthlyRank : null,
  });

  syncLeaderboardEntryToApi({
    mode: "ranked",
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

export const formatRankedLeaderboardElo = (entry: Pick<RankedLeaderboardEntry, "elo">) =>
  formatRankedElo(entry.elo);

export const formatRankedLeaderboardRecord = (
  entry: Pick<RankedLeaderboardEntry, "wins" | "losses">,
) => `${entry.wins}-${entry.losses}`;

export const formatRankedLeaderboardWinStreak = (
  entry: Pick<RankedLeaderboardEntry, "winStreak">,
) => (entry.winStreak > 0 ? `${entry.winStreak}` : "—");

export const formatRankedLeaderboardLossStreak = (
  entry: Pick<RankedLeaderboardEntry, "lossStreak">,
) => (entry.lossStreak > 0 ? `${entry.lossStreak}` : "—");

export const getRankedLeaderboardFootnote = (
  sort: RankedLeaderboardSort = "elo",
  seasonId = getCurrentSeasonId(),
) => {
  const seasonNote = `${PRO_LEADERBOARD_LABEL} for ${formatSeasonLabel(seasonId)}. Real front offices only — ratings reset at the start of each calendar month.`;

  switch (sort) {
    case "winStreak":
      return `${seasonNote} Sorted by active win streak.`;
    case "lossStreak":
      return `${seasonNote} Sorted by active loss streak.`;
    default:
      return `${seasonNote} Sorted by ${RATING_LABEL}.`;
  }
};

export const findRankedOpponentFromLeaderboard = (
  targetElo: number,
): RankedLeaderboardEntry | null => {
  const entries = ensureNpcOpponentPool();

  if (entries.length === 0) {
    return null;
  }

  const sorted = [...entries].sort(
    (left, right) =>
      Math.abs(left.elo - targetElo) - Math.abs(right.elo - targetElo) ||
      left.name.localeCompare(right.name),
  );

  const closest = sorted[0]!;

  if (Math.abs(closest.elo - targetElo) <= 200) {
    return closest;
  }

  return null;
};
