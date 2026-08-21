/** Private rematch lobbies keyed by the prior live match. */

import {
  parsePrivateRoomMode,
  type PrivateRoomMode,
} from "./privateRooms";

export const PRIVATE_REMATCH_TTL_MS = 3 * 60 * 1000;

export type PrivateRematchStatus =
  | "waiting"
  | "matched"
  | "cancelled"
  | "expired";

export interface PrivateRematchRow {
  source_match_id: string;
  mode: string;
  player_a_id: string;
  player_a_team: string;
  player_a_elo: number;
  player_b_id: string;
  player_b_team: string;
  player_b_elo: number;
  player_a_ready_at: string | null;
  player_b_ready_at: string | null;
  new_match_id: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

interface LiveMatchPairRow {
  id: string;
  mode: string;
  player_a_id: string;
  player_a_team: string;
  player_a_elo: number;
  player_b_id: string;
  player_b_team: string;
  player_b_elo: number;
}

export const privateRematchExpiresAt = (fromMs = Date.now()) =>
  new Date(fromMs + PRIVATE_REMATCH_TTL_MS).toISOString();

export const cleanupExpiredPrivateRematches = async (db: D1Database) => {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE private_rematches
       SET status = 'expired'
       WHERE status = 'waiting' AND expires_at < ?`,
    )
    .bind(now)
    .run();
};

export const getPrivateRematch = async (
  db: D1Database,
  sourceMatchId: string,
) =>
  db
    .prepare(
      `SELECT source_match_id, mode, player_a_id, player_a_team, player_a_elo,
              player_b_id, player_b_team, player_b_elo,
              player_a_ready_at, player_b_ready_at, new_match_id,
              status, created_at, expires_at
       FROM private_rematches
       WHERE source_match_id = ?`,
    )
    .bind(sourceMatchId)
    .first<PrivateRematchRow>();

export const loadLiveMatchPair = async (db: D1Database, matchId: string) =>
  db
    .prepare(
      `SELECT id, mode, player_a_id, player_a_team, player_a_elo,
              player_b_id, player_b_team, player_b_elo
       FROM live_matches
       WHERE id = ?`,
    )
    .bind(matchId)
    .first<LiveMatchPairRow>();

const createRematchLiveMatch = async (
  db: D1Database,
  params: {
    matchId: string;
    mode: PrivateRoomMode;
    playerAId: string;
    playerATeam: string;
    playerAElo: number;
    playerBId: string;
    playerBTeam: string;
    playerBElo: number;
  },
) => {
  const createdAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO live_matches (
        id, mode,
        player_a_id, player_a_team, player_a_elo,
        player_b_id, player_b_team, player_b_elo,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      params.matchId,
      params.mode,
      params.playerAId,
      params.playerATeam,
      Math.round(params.playerAElo),
      params.playerBId,
      params.playerBTeam,
      Math.round(params.playerBElo),
      createdAt,
    )
    .run();
  return params.matchId;
};

export const isLiveMatchStillJoinable = async (db: D1Database, matchId: string) => {
  const row = await db
    .prepare(
      `SELECT player_a_lineup_json, player_b_lineup_json, created_at
       FROM live_matches
       WHERE id = ?`,
    )
    .bind(matchId)
    .first<{
      player_a_lineup_json: string | null;
      player_b_lineup_json: string | null;
      created_at: string;
    }>();

  if (!row) {
    return false;
  }

  // Already drafting / finished — do not reconnect into this match.
  if (row.player_a_lineup_json || row.player_b_lineup_json) {
    return false;
  }

  const createdMs = Date.parse(row.created_at);
  if (!Number.isFinite(createdMs)) {
    return false;
  }

  // Same window as rematch lobby TTL — stale matched lobbies start fresh.
  return Date.now() - createdMs < PRIVATE_REMATCH_TTL_MS;
};

const matchedResultForPlayer = (
  row: PrivateRematchRow,
  params: {
    sourceMatchId: string;
    mode: PrivateRoomMode;
    isPlayerA: boolean;
    matchId: string;
  },
): OfferPrivateRematchResult => ({
  status: "matched",
  sourceMatchId: params.sourceMatchId,
  matchId: params.matchId,
  mode: params.mode,
  opponent: params.isPlayerA
    ? {
        playerId: row.player_b_id,
        teamName: row.player_b_team,
        elo: Math.round(row.player_b_elo),
      }
    : {
        playerId: row.player_a_id,
        teamName: row.player_a_team,
        elo: Math.round(row.player_a_elo),
      },
});

export type OfferPrivateRematchResult =
  | {
      status: "waiting";
      sourceMatchId: string;
      expiresAt: string;
      waitingForOpponent: true;
    }
  | {
      status: "matched";
      sourceMatchId: string;
      matchId: string;
      mode: PrivateRoomMode;
      opponent: {
        playerId: string;
        teamName: string;
        elo: number;
      };
    };

/**
 * Mark the caller ready to rematch. When both prior opponents are ready,
 * create a fresh live match and return matched for both.
 */
export const offerPrivateRematch = async (
  db: D1Database,
  params: {
    sourceMatchId: string;
    playerId: string;
    teamName: string;
    elo: number;
  },
): Promise<
  | OfferPrivateRematchResult
  | { error: string; status?: number }
> => {
  await cleanupExpiredPrivateRematches(db);

  const source = await loadLiveMatchPair(db, params.sourceMatchId);
  if (!source) {
    return { error: "That match is no longer available to rematch.", status: 404 };
  }

  const mode = parsePrivateRoomMode(source.mode);
  if (!mode) {
    return { error: "That match cannot be rematched.", status: 400 };
  }

  const isPlayerA = source.player_a_id === params.playerId;
  const isPlayerB = source.player_b_id === params.playerId;
  if (!isPlayerA && !isPlayerB) {
    return { error: "Only the players from that match can rematch.", status: 403 };
  }

  const existing = await getPrivateRematch(db, params.sourceMatchId);
  const now = new Date().toISOString();
  const elo = Math.round(params.elo);

  if (existing?.status === "matched" && existing.new_match_id) {
    if (await isLiveMatchStillJoinable(db, existing.new_match_id)) {
      return matchedResultForPlayer(existing, {
        sourceMatchId: params.sourceMatchId,
        mode,
        isPlayerA,
        matchId: existing.new_match_id,
      });
    }
    // Prior rematch already started drafting — fall through to a fresh lobby.
  }

  if (
    existing &&
    existing.status === "waiting" &&
    existing.expires_at >= now
  ) {
    return finalizeReadyOffer(db, {
      sourceMatchId: params.sourceMatchId,
      playerId: params.playerId,
      teamName: params.teamName,
      elo,
      mode,
      isPlayerA,
    });
  }

  // Start a fresh lobby (or replace an expired/cancelled/stale row).
  const expiresAt = privateRematchExpiresAt();
  await db
    .prepare(
      `INSERT INTO private_rematches (
         source_match_id, mode,
         player_a_id, player_a_team, player_a_elo,
         player_b_id, player_b_team, player_b_elo,
         player_a_ready_at, player_b_ready_at,
         new_match_id, status, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'waiting', ?, ?)
       ON CONFLICT(source_match_id) DO UPDATE SET
         mode = excluded.mode,
         player_a_id = excluded.player_a_id,
         player_a_team = excluded.player_a_team,
         player_a_elo = excluded.player_a_elo,
         player_b_id = excluded.player_b_id,
         player_b_team = excluded.player_b_team,
         player_b_elo = excluded.player_b_elo,
         player_a_ready_at = NULL,
         player_b_ready_at = NULL,
         new_match_id = NULL,
         status = 'waiting',
         created_at = excluded.created_at,
         expires_at = excluded.expires_at
       WHERE private_rematches.status != 'waiting'
          OR private_rematches.expires_at < excluded.created_at`,
    )
    .bind(
      params.sourceMatchId,
      mode,
      source.player_a_id,
      source.player_a_team,
      Math.round(source.player_a_elo),
      source.player_b_id,
      source.player_b_team,
      Math.round(source.player_b_elo),
      null,
      null,
      now,
      expiresAt,
    )
    .run();

  return finalizeReadyOffer(db, {
    sourceMatchId: params.sourceMatchId,
    playerId: params.playerId,
    teamName: params.teamName,
    elo,
    mode,
    isPlayerA,
  });
};

const finalizeReadyOffer = async (
  db: D1Database,
  params: {
    sourceMatchId: string;
    playerId: string;
    teamName: string;
    elo: number;
    mode: PrivateRoomMode;
    isPlayerA: boolean;
  },
): Promise<
  | OfferPrivateRematchResult
  | { error: string; status?: number }
> => {
  const now = new Date().toISOString();

  if (params.isPlayerA) {
    await db
      .prepare(
        `UPDATE private_rematches
         SET player_a_team = ?, player_a_elo = ?, player_a_ready_at = ?
         WHERE source_match_id = ? AND status = 'waiting'`,
      )
      .bind(params.teamName, params.elo, now, params.sourceMatchId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE private_rematches
         SET player_b_team = ?, player_b_elo = ?, player_b_ready_at = ?
         WHERE source_match_id = ? AND status = 'waiting'`,
      )
      .bind(params.teamName, params.elo, now, params.sourceMatchId)
      .run();
  }

  const refreshed = await getPrivateRematch(db, params.sourceMatchId);
  if (!refreshed || refreshed.status !== "waiting") {
    if (refreshed?.status === "matched" && refreshed.new_match_id) {
      return matchedResultForPlayer(refreshed, {
        sourceMatchId: params.sourceMatchId,
        mode: params.mode,
        isPlayerA: params.isPlayerA,
        matchId: refreshed.new_match_id,
      });
    }
    return { error: "Rematch lobby expired. Try again.", status: 410 };
  }

  if (refreshed.player_a_ready_at && refreshed.player_b_ready_at) {
    // Claim first (like private rooms), then create the live match — avoids
    // orphan live_matches when both clients finalize at once or one cancels.
    const newMatchId = crypto.randomUUID();
    const claimed = await db
      .prepare(
        `UPDATE private_rematches
         SET status = 'matched', new_match_id = ?
         WHERE source_match_id = ?
           AND status = 'waiting'
           AND player_a_ready_at IS NOT NULL
           AND player_b_ready_at IS NOT NULL
           AND new_match_id IS NULL`,
      )
      .bind(newMatchId, params.sourceMatchId)
      .run();

    if ((claimed.meta?.changes ?? 0) >= 1) {
      await createRematchLiveMatch(db, {
        matchId: newMatchId,
        mode: params.mode,
        playerAId: refreshed.player_a_id,
        playerATeam: refreshed.player_a_team,
        playerAElo: refreshed.player_a_elo,
        playerBId: refreshed.player_b_id,
        playerBTeam: refreshed.player_b_team,
        playerBElo: refreshed.player_b_elo,
      });

      return matchedResultForPlayer(
        { ...refreshed, new_match_id: newMatchId, status: "matched" },
        {
          sourceMatchId: params.sourceMatchId,
          mode: params.mode,
          isPlayerA: params.isPlayerA,
          matchId: newMatchId,
        },
      );
    }

    const raced = await getPrivateRematch(db, params.sourceMatchId);
    if (raced?.status === "matched" && raced.new_match_id) {
      return matchedResultForPlayer(raced, {
        sourceMatchId: params.sourceMatchId,
        mode: params.mode,
        isPlayerA: params.isPlayerA,
        matchId: raced.new_match_id,
      });
    }

    return { error: "Could not start rematch. Try again.", status: 409 };
  }

  return {
    status: "waiting",
    sourceMatchId: params.sourceMatchId,
    expiresAt: refreshed.expires_at,
    waitingForOpponent: true,
  };
};

export const cancelPrivateRematchOffer = async (
  db: D1Database,
  params: { sourceMatchId: string; playerId: string },
): Promise<boolean> => {
  const row = await getPrivateRematch(db, params.sourceMatchId);
  if (!row || row.status !== "waiting") {
    return false;
  }

  if (
    row.player_a_id !== params.playerId &&
    row.player_b_id !== params.playerId
  ) {
    return false;
  }

  // If the other player is not ready yet, cancel the lobby entirely.
  const otherReady =
    row.player_a_id === params.playerId
      ? Boolean(row.player_b_ready_at)
      : Boolean(row.player_a_ready_at);

  if (!otherReady) {
    await db
      .prepare(
        `UPDATE private_rematches
         SET status = 'cancelled'
         WHERE source_match_id = ?
           AND status = 'waiting'
           AND new_match_id IS NULL`,
      )
      .bind(params.sourceMatchId)
      .run();
    return true;
  }

  // Other player is waiting — only clear this player's ready flag.
  if (row.player_a_id === params.playerId) {
    await db
      .prepare(
        `UPDATE private_rematches
         SET player_a_ready_at = NULL
         WHERE source_match_id = ?
           AND status = 'waiting'
           AND new_match_id IS NULL`,
      )
      .bind(params.sourceMatchId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE private_rematches
         SET player_b_ready_at = NULL
         WHERE source_match_id = ?
           AND status = 'waiting'
           AND new_match_id IS NULL`,
      )
      .bind(params.sourceMatchId)
      .run();
  }

  return true;
};
