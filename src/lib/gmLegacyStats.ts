import { readJson, writeJson } from "./browserStorage";
import { getOrCreatePlayerId } from "./playerRecord";
import { getCurrentSeasonId } from "./rankedSeason";

const GM_LEGACY_STATS_KEY = "nba-head-to-head-gm-legacy-stats";

export interface GmLegacyStats {
  playerId: string;
  peakElo: number;
  peakEloSeasonId: string;
  bestMonthlyRank: number | null;
  bestMonthlyRankSeasonId: string;
  updatedAt: string;
}

const createDefaultLegacyStats = (playerId: string): GmLegacyStats => ({
  playerId,
  peakElo: 0,
  peakEloSeasonId: "",
  bestMonthlyRank: null,
  bestMonthlyRankSeasonId: "",
  updatedAt: new Date().toISOString(),
});

export const loadGmLegacyStats = (): GmLegacyStats => {
  const playerId = getOrCreatePlayerId();
  const saved = readJson<Partial<GmLegacyStats>>(GM_LEGACY_STATS_KEY);

  if (!saved || saved.playerId !== playerId) {
    return createDefaultLegacyStats(playerId);
  }

  return {
    playerId,
    peakElo: Math.max(0, Math.round(saved.peakElo ?? 0)),
    peakEloSeasonId: saved.peakEloSeasonId ?? "",
    bestMonthlyRank:
      typeof saved.bestMonthlyRank === "number" ? saved.bestMonthlyRank : null,
    bestMonthlyRankSeasonId: saved.bestMonthlyRankSeasonId ?? "",
    updatedAt: saved.updatedAt ?? new Date().toISOString(),
  };
};

export const saveGmLegacyStats = (stats: GmLegacyStats) => {
  writeJson(GM_LEGACY_STATS_KEY, stats);
};

export const recordLocalGmLegacySnapshot = (input: {
  elo: number;
  seasonId?: string;
  monthlyRank?: number | null;
}) => {
  const playerId = getOrCreatePlayerId();
  const seasonId = input.seasonId ?? getCurrentSeasonId();
  const current = loadGmLegacyStats();
  const elo = Math.max(0, Math.round(input.elo));
  const updatedAt = new Date().toISOString();

  const peakElo = Math.max(current.peakElo, elo);
  const peakEloSeasonId =
    elo >= current.peakElo ? seasonId : current.peakEloSeasonId;

  let bestMonthlyRank = current.bestMonthlyRank;
  let bestMonthlyRankSeasonId = current.bestMonthlyRankSeasonId;

  if (
    input.monthlyRank &&
    input.monthlyRank > 0 &&
    (bestMonthlyRank === null || input.monthlyRank < bestMonthlyRank)
  ) {
    bestMonthlyRank = input.monthlyRank;
    bestMonthlyRankSeasonId = seasonId;
  }

  const next: GmLegacyStats = {
    playerId,
    peakElo,
    peakEloSeasonId,
    bestMonthlyRank,
    bestMonthlyRankSeasonId,
    updatedAt,
  };

  saveGmLegacyStats(next);
  return next;
};

export const mergeGmLegacyStats = (
  local: GmLegacyStats,
  remote: GmLegacyStats | null | undefined,
): GmLegacyStats => {
  if (!remote) {
    return local;
  }

  const peakElo = Math.max(local.peakElo, remote.peakElo);
  const peakEloSeasonId =
    remote.peakElo >= local.peakElo
      ? remote.peakEloSeasonId
      : local.peakEloSeasonId;

  let bestMonthlyRank = local.bestMonthlyRank;
  let bestMonthlyRankSeasonId = local.bestMonthlyRankSeasonId;

  if (
    remote.bestMonthlyRank &&
    (bestMonthlyRank === null || remote.bestMonthlyRank < bestMonthlyRank)
  ) {
    bestMonthlyRank = remote.bestMonthlyRank;
    bestMonthlyRankSeasonId = remote.bestMonthlyRankSeasonId;
  }

  return {
    playerId: local.playerId,
    peakElo,
    peakEloSeasonId,
    bestMonthlyRank,
    bestMonthlyRankSeasonId,
    updatedAt: remote.updatedAt || local.updatedAt,
  };
};
