import type { MatchmakingMode, StoredLineupRow } from "../types";
import { INVALID_STORED_LINEUP_CONSUMED_BY } from "./storedLineups";

export interface GhostOpponentPayload {
  id: string;
  teamName: string;
  lineup: string[];
  elo: number;
  createdAt: string;
}

export interface QueueEntryRow {
  id: string;
  mode: string;
  player_id: string;
  team_name: string;
  elo: number;
  joined_at: string;
  expires_at: string;
}

const cutoffIso = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
};

export const claimGhostOpponent = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
  elo: number,
  rowToPayload: (row: StoredLineupRow) => GhostOpponentPayload | null,
): Promise<GhostOpponentPayload | null> => {
  const bands = [
    [Math.max(0, Math.round(elo) - 250), Math.round(elo) + 250],
    [0, 9999],
  ] as const;
  const cutoff = cutoffIso(14);
  const now = new Date().toISOString();

  for (const [minElo, maxElo] of bands) {
    const candidates = await db
      .prepare(
        `SELECT id, mode, player_id, team_name, lineup_json, elo, created_at
         FROM stored_lineups
         WHERE mode = ?
           AND player_id != ?
           AND consumed_at IS NULL
           AND elo BETWEEN ? AND ?
           AND created_at >= ?
           AND json_array_length(lineup_json) = 5
         ORDER BY RANDOM()
         LIMIT 12`,
      )
      .bind(mode, playerId, minElo, maxElo, cutoff)
      .all<StoredLineupRow>();

    for (const row of candidates.results ?? []) {
      const payload = rowToPayload(row);

      if (!payload) {
        await db
          .prepare(
            `UPDATE stored_lineups
             SET consumed_at = ?, consumed_by = ?
             WHERE id = ? AND consumed_at IS NULL`,
          )
          .bind(now, INVALID_STORED_LINEUP_CONSUMED_BY, row.id)
          .run();
        continue;
      }

      const claim = await db
        .prepare(
          `UPDATE stored_lineups
           SET consumed_at = ?, consumed_by = ?
           WHERE id = ? AND consumed_at IS NULL`,
        )
        .bind(now, playerId, row.id)
        .run();

      if ((claim.meta?.changes ?? 0) > 0) {
        return payload;
      }
    }
  }

  return null;
};

export const claimQueueOpponent = async (
  db: D1Database,
  mode: MatchmakingMode,
  joinerPlayerId: string,
  joinerElo: number,
  now: string,
): Promise<QueueEntryRow | null> => {
  const minElo = Math.max(0, Math.round(joinerElo) - 250);
  const maxElo = Math.round(joinerElo) + 250;

  const claimed = await db
    .prepare(
      `DELETE FROM matchmaking_queue
       WHERE id = (
         SELECT id
         FROM matchmaking_queue
         WHERE mode = ?
           AND player_id != ?
           AND expires_at >= ?
           AND elo BETWEEN ? AND ?
         ORDER BY joined_at ASC
         LIMIT 1
       )
       RETURNING id, mode, player_id, team_name, elo, joined_at, expires_at`,
    )
    .bind(mode, joinerPlayerId, now, minElo, maxElo)
    .first<QueueEntryRow>();

  if (claimed) {
    return claimed;
  }

  return (
    (await db
      .prepare(
        `DELETE FROM matchmaking_queue
         WHERE id = (
           SELECT id
           FROM matchmaking_queue
           WHERE mode = ?
             AND player_id != ?
             AND expires_at >= ?
           ORDER BY joined_at ASC
           LIMIT 1
         )
         RETURNING id, mode, player_id, team_name, elo, joined_at, expires_at`,
      )
      .bind(mode, joinerPlayerId, now)
      .first<QueueEntryRow>()) ?? null
  );
};
