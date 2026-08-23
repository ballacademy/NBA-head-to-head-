import type { MatchmakingMode, StoredLineupRow } from "../types";
import {
  INVALID_STORED_LINEUP_CONSUMED_BY,
  isStoredLineupWithinSalaryCap,
  isStoredLineupWithinStarGap,
  OVER_CAP_STORED_LINEUP_CONSUMED_BY,
} from "./storedLineups";

export interface GhostOpponentPayload {
  id: string;
  teamName: string;
  lineup: string[];
  elo: number;
  createdAt: string;
  publicPlayerId?: string;
  username?: string | null;
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

/** Soft claim TTL so abandoned ghost searches release Pro locks quickly. */
export const GHOST_CLAIM_TTL_MS = 90 * 1000;

const cutoffIso = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
};

const isClaimActive = (row: StoredLineupRow, nowMs: number) => {
  if (!row.claim_expires_at) {
    return false;
  }

  const expires = Date.parse(row.claim_expires_at);
  return Number.isFinite(expires) && expires > nowMs;
};

export const claimGhostOpponent = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
  elo: number,
  challengerStarCount: number,
  rowToPayload: (
    row: StoredLineupRow,
  ) =>
    | GhostOpponentPayload
    | null
    | Promise<GhostOpponentPayload | null>,
): Promise<GhostOpponentPayload | null> => {
  const bands = [
    [Math.max(0, Math.round(elo) - 250), Math.round(elo) + 250],
    [0, 9999],
  ] as const;
  const cutoff = cutoffIso(14);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const claimExpiresAt = new Date(nowMs + GHOST_CLAIM_TTL_MS).toISOString();

  for (const [minElo, maxElo] of bands) {
    const candidates = await db
      .prepare(
        `SELECT id, mode, player_id, team_name, lineup_json, elo, created_at,
                awaiting_live, salary_total, star_count, claimed_by, claim_expires_at
         FROM stored_lineups
         WHERE mode = ?
           AND player_id != ?
           AND consumed_at IS NULL
           AND elo BETWEEN ? AND ?
           AND created_at >= ?
           AND json_array_length(lineup_json) = 5
         ORDER BY RANDOM()
         LIMIT 24`,
      )
      .bind(mode, playerId, minElo, maxElo, cutoff)
      .all<StoredLineupRow>();

    for (const row of candidates.results ?? []) {
      if (isClaimActive(row, nowMs) && row.claimed_by !== playerId) {
        continue;
      }

      const payload = await Promise.resolve(rowToPayload(row));

      if (!payload) {
        await db
          .prepare(
            `UPDATE stored_lineups
             SET consumed_at = ?, consumed_by = ?,
                 claimed_by = NULL, claim_expires_at = NULL
             WHERE id = ? AND consumed_at IS NULL`,
          )
          .bind(now, INVALID_STORED_LINEUP_CONSUMED_BY, row.id)
          .run();
        continue;
      }

      if (!isStoredLineupWithinSalaryCap(mode, row.salary_total)) {
        await db
          .prepare(
            `UPDATE stored_lineups
             SET consumed_at = ?, consumed_by = ?,
                 claimed_by = NULL, claim_expires_at = NULL
             WHERE id = ? AND consumed_at IS NULL`,
          )
          .bind(now, OVER_CAP_STORED_LINEUP_CONSUMED_BY, row.id)
          .run();
        continue;
      }

      if (!isStoredLineupWithinStarGap(challengerStarCount, row.star_count)) {
        continue;
      }

      const claim = await db
        .prepare(
          `UPDATE stored_lineups
           SET claimed_by = ?, claim_expires_at = ?
           WHERE id = ?
             AND consumed_at IS NULL
             AND (
               claim_expires_at IS NULL
               OR claim_expires_at < ?
               OR claimed_by = ?
             )`,
        )
        .bind(playerId, claimExpiresAt, row.id, now, playerId)
        .run();

      if ((claim.meta?.changes ?? 0) > 0) {
        return payload;
      }
    }
  }

  return null;
};

export const releaseGhostOpponentClaim = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
) => {
  await db
    .prepare(
      `UPDATE stored_lineups
       SET claimed_by = NULL, claim_expires_at = NULL
       WHERE mode = ?
         AND claimed_by = ?
         AND consumed_at IS NULL`,
    )
    .bind(mode, playerId)
    .run();
};

export const claimQueueOpponentAndCreateMatch = async (
  db: D1Database,
  mode: MatchmakingMode,
  joiner: { playerId: string; teamName: string; elo: number },
  now: string,
): Promise<{ matchId: string; opponent: QueueEntryRow } | null> => {
  const selectBanded = () => {
    const minElo = Math.max(0, Math.round(joiner.elo) - 250);
    const maxElo = Math.round(joiner.elo) + 250;
    return db
      .prepare(
        `SELECT id, mode, player_id, team_name, elo, joined_at, expires_at
         FROM matchmaking_queue
         WHERE mode = ?
           AND player_id != ?
           AND expires_at >= ?
           AND elo BETWEEN ? AND ?
         ORDER BY joined_at ASC
         LIMIT 1`,
      )
      .bind(mode, joiner.playerId, now, minElo, maxElo)
      .first<QueueEntryRow>();
  };

  const selectAny = () =>
    db
      .prepare(
        `SELECT id, mode, player_id, team_name, elo, joined_at, expires_at
         FROM matchmaking_queue
         WHERE mode = ?
           AND player_id != ?
           AND expires_at >= ?
         ORDER BY joined_at ASC
         LIMIT 1`,
      )
      .bind(mode, joiner.playerId, now)
      .first<QueueEntryRow>();

  // A few attempts: another joiner may race the same candidate between SELECT and batch.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = (await selectBanded()) ?? (await selectAny());
    if (!candidate) {
      return null;
    }

    const matchId = crypto.randomUUID();
    const createdAt = now;
    const results = await db.batch([
      db
        .prepare(
          `INSERT INTO live_matches (
            id, mode,
            player_a_id, player_a_team, player_a_elo,
            player_b_id, player_b_team, player_b_elo,
            created_at
          )
          SELECT ?, mode, player_id, team_name, elo, ?, ?, ?, ?
          FROM matchmaking_queue
          WHERE id = ? AND expires_at >= ?`,
        )
        .bind(
          matchId,
          joiner.playerId,
          joiner.teamName,
          Math.round(joiner.elo),
          createdAt,
          candidate.id,
          now,
        ),
      db
        .prepare(
          `DELETE FROM matchmaking_queue
           WHERE id = ?
             AND EXISTS (SELECT 1 FROM live_matches WHERE id = ?)`,
        )
        .bind(candidate.id, matchId),
    ]);

    if ((results[0]?.meta?.changes ?? 0) >= 1) {
      return { matchId, opponent: candidate };
    }
  }

  return null;
};

/** @deprecated Prefer {@link claimQueueOpponentAndCreateMatch} — delete-first can drop waiters. */
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
