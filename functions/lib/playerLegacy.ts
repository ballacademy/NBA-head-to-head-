import type { Env } from "../types";

export interface PlayerLegacyStatsRow {
  player_id: string;
  peak_elo: number;
  peak_elo_season_id: string;
  best_monthly_rank: number | null;
  best_monthly_rank_season_id: string;
  updated_at: string;
}

export interface PlayerLegacyProfile {
  playerId: string;
  peakElo: number;
  peakEloSeasonId: string;
  bestMonthlyRank: number | null;
  bestMonthlyRankSeasonId: string;
  updatedAt: string;
}

const rowToProfile = (row: PlayerLegacyStatsRow): PlayerLegacyProfile => ({
  playerId: row.player_id,
  peakElo: row.peak_elo,
  peakEloSeasonId: row.peak_elo_season_id,
  bestMonthlyRank: row.best_monthly_rank,
  bestMonthlyRankSeasonId: row.best_monthly_rank_season_id,
  updatedAt: row.updated_at,
});

export const getRankInSeason = async (
  db: D1Database,
  seasonId: string,
  elo: number,
) => {
  const row = await db
    .prepare(
      `SELECT COUNT(*) + 1 AS rank
       FROM leaderboard_entries
       WHERE mode = 'ranked' AND season_id = ? AND elo > ?`,
    )
    .bind(seasonId, elo)
    .first<{ rank: number }>();

  return row?.rank ?? null;
};

export const computeLegacyFromHistory = async (
  db: D1Database,
  playerId: string,
): Promise<PlayerLegacyProfile | null> => {
  const peakRow = await db
    .prepare(
      `SELECT elo, season_id
       FROM leaderboard_entries
       WHERE mode = 'ranked' AND player_id = ?
       ORDER BY elo DESC, updated_at DESC
       LIMIT 1`,
    )
    .bind(playerId)
    .first<{ elo: number; season_id: string }>();

  if (!peakRow) {
    return null;
  }

  const seasons = await db
    .prepare(
      `SELECT DISTINCT season_id
       FROM leaderboard_entries
       WHERE mode = 'ranked' AND player_id = ? AND season_id != ''`,
    )
    .bind(playerId)
    .all<{ season_id: string }>();

  let bestMonthlyRank: number | null = null;
  let bestMonthlyRankSeasonId = "";

  for (const season of seasons.results ?? []) {
    const entry = await db
      .prepare(
        `SELECT elo
         FROM leaderboard_entries
         WHERE mode = 'ranked' AND season_id = ? AND player_id = ?`,
      )
      .bind(season.season_id, playerId)
      .first<{ elo: number }>();

    if (!entry) {
      continue;
    }

    const rank = await getRankInSeason(db, season.season_id, entry.elo);

    if (rank && (bestMonthlyRank === null || rank < bestMonthlyRank)) {
      bestMonthlyRank = rank;
      bestMonthlyRankSeasonId = season.season_id;
    }
  }

  return {
    playerId,
    peakElo: peakRow.elo,
    peakEloSeasonId: peakRow.season_id,
    bestMonthlyRank,
    bestMonthlyRankSeasonId,
    updatedAt: new Date().toISOString(),
  };
};

export const loadPlayerLegacyProfile = async (
  db: D1Database,
  playerId: string,
): Promise<PlayerLegacyProfile | null> => {
  const row = await db
    .prepare(
      `SELECT player_id, peak_elo, peak_elo_season_id, best_monthly_rank,
              best_monthly_rank_season_id, updated_at
       FROM player_legacy_stats
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<PlayerLegacyStatsRow>();

  if (row) {
    return rowToProfile(row);
  }

  return computeLegacyFromHistory(db, playerId);
};

export const upsertPlayerLegacyStats = async (
  env: Env,
  playerId: string,
  seasonId: string,
  elo: number,
) => {
  const db = env.DB;
  const currentRank = await getRankInSeason(db, seasonId, elo);
  const existing = await loadPlayerLegacyProfile(db, playerId);
  const updatedAt = new Date().toISOString();

  const peakElo = Math.max(elo, existing?.peakElo ?? 0);
  const peakEloSeasonId =
    elo >= (existing?.peakElo ?? 0)
      ? seasonId
      : existing?.peakEloSeasonId ?? seasonId;

  let bestMonthlyRank = existing?.bestMonthlyRank ?? null;
  let bestMonthlyRankSeasonId = existing?.bestMonthlyRankSeasonId ?? "";

  if (currentRank && (bestMonthlyRank === null || currentRank < bestMonthlyRank)) {
    bestMonthlyRank = currentRank;
    bestMonthlyRankSeasonId = seasonId;
  }

  await db
    .prepare(
      `INSERT INTO player_legacy_stats (
        player_id, peak_elo, peak_elo_season_id, best_monthly_rank,
        best_monthly_rank_season_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET
        peak_elo = excluded.peak_elo,
        peak_elo_season_id = excluded.peak_elo_season_id,
        best_monthly_rank = excluded.best_monthly_rank,
        best_monthly_rank_season_id = excluded.best_monthly_rank_season_id,
        updated_at = excluded.updated_at`,
    )
    .bind(
      playerId,
      peakElo,
      peakEloSeasonId,
      bestMonthlyRank,
      bestMonthlyRankSeasonId,
      updatedAt,
    )
    .run();
};
