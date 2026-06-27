import type { Env, MatchmakingMode } from "../types";

const ELO_BAND = 250;
const QUEUE_TTL_SECONDS = 45;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parseMode = (value: string | null): MatchmakingMode | null =>
  value === "classic" || value === "ranked" ? value : null;

const nowIso = () => new Date().toISOString();

const expiresIso = (seconds: number) =>
  new Date(Date.now() + seconds * 1000).toISOString();

interface QueueRow {
  id: string;
  mode: string;
  player_id: string;
  team_name: string;
  elo: number;
  joined_at: string;
  expires_at: string;
}

interface LiveMatchRow {
  id: string;
  mode: string;
  player_a_id: string;
  player_a_team: string;
  player_a_elo: number;
  player_b_id: string;
  player_b_team: string;
  player_b_elo: number;
  created_at: string;
}

const cleanupExpiredQueue = async (db: D1Database) => {
  await db
    .prepare(`DELETE FROM matchmaking_queue WHERE expires_at < ?`)
    .bind(nowIso())
    .run();
};

const findWaitingOpponent = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
  elo: number,
) => {
  const minElo = Math.max(0, Math.round(elo) - ELO_BAND);
  const maxElo = Math.round(elo) + ELO_BAND;

  return (
    (await db
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
      .bind(mode, playerId, nowIso(), minElo, maxElo)
      .first<QueueRow>()) ??
    (await db
      .prepare(
        `SELECT id, mode, player_id, team_name, elo, joined_at, expires_at
         FROM matchmaking_queue
         WHERE mode = ?
           AND player_id != ?
           AND expires_at >= ?
         ORDER BY joined_at ASC
         LIMIT 1`,
      )
      .bind(mode, playerId, nowIso())
      .first<QueueRow>())
  );
};

const findLiveMatchSince = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
  sinceIso: string,
) =>
  db
    .prepare(
      `SELECT id, mode, player_a_id, player_a_team, player_a_elo,
              player_b_id, player_b_team, player_b_elo, created_at
       FROM live_matches
       WHERE mode = ?
         AND (player_a_id = ? OR player_b_id = ?)
         AND created_at >= ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(mode, playerId, playerId, sinceIso)
    .first<LiveMatchRow>();

const opponentFromMatch = (match: LiveMatchRow, playerId: string) => {
  if (match.player_a_id === playerId) {
    return {
      matchId: match.id,
      teamName: match.player_b_team,
      elo: match.player_b_elo,
      playerId: match.player_b_id,
    };
  }

  return {
    matchId: match.id,
    teamName: match.player_a_team,
    elo: match.player_a_elo,
    playerId: match.player_a_id,
  };
};

const createLiveMatch = async (
  db: D1Database,
  mode: MatchmakingMode,
  opponent: QueueRow,
  joiner: { playerId: string; teamName: string; elo: number },
) => {
  const matchId = crypto.randomUUID();
  const createdAt = nowIso();

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
      matchId,
      mode,
      opponent.player_id,
      opponent.team_name,
      Math.round(opponent.elo),
      joiner.playerId,
      joiner.teamName,
      Math.round(joiner.elo),
      createdAt,
    )
    .run();

  await db
    .prepare(`DELETE FROM matchmaking_queue WHERE id = ?`)
    .bind(opponent.id)
    .run();

  return {
    matchId,
    createdAt,
    opponent: {
      teamName: opponent.team_name,
      elo: opponent.elo,
      playerId: opponent.player_id,
    },
  };
};

interface QueueBody {
  mode?: unknown;
  playerId?: unknown;
  teamName?: unknown;
  elo?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: QueueBody;

  try {
    body = (await context.request.json()) as QueueBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const mode = parseMode(typeof body.mode === "string" ? body.mode : null);
  const playerId =
    typeof body.playerId === "string" ? body.playerId.trim() : "";
  const teamName =
    typeof body.teamName === "string" ? body.teamName.trim().slice(0, 32) : "";
  const elo = Number(body.elo ?? 1000);

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  if (!playerId || !teamName) {
    return json({ error: "playerId and teamName are required" }, 400);
  }

  if (!Number.isFinite(elo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  const db = context.env.DB;
  await cleanupExpiredQueue(db);

  const opponent = await findWaitingOpponent(
    db,
    mode,
    playerId,
    Math.round(elo),
  );

  if (opponent) {
    const match = await createLiveMatch(db, mode, opponent, {
      playerId,
      teamName,
      elo: Math.round(elo),
    });

    return json({
      status: "matched",
      matchId: match.matchId,
      opponent: match.opponent,
    });
  }

  await db
    .prepare(`DELETE FROM matchmaking_queue WHERE mode = ? AND player_id = ?`)
    .bind(mode, playerId)
    .run();

  const queueId = crypto.randomUUID();
  const joinedAt = nowIso();

  await db
    .prepare(
      `INSERT INTO matchmaking_queue (
        id, mode, player_id, team_name, elo, joined_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      queueId,
      mode,
      playerId,
      teamName,
      Math.round(elo),
      joinedAt,
      expiresIso(QUEUE_TTL_SECONDS),
    )
    .run();

  return json({ status: "waiting", joinedAt });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const mode = parseMode(url.searchParams.get("mode"));
  const playerId = url.searchParams.get("playerId")?.trim();

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const db = context.env.DB;
  await cleanupExpiredQueue(db);

  const queueEntry = await db
    .prepare(
      `SELECT id, mode, player_id, team_name, elo, joined_at, expires_at
       FROM matchmaking_queue
       WHERE mode = ? AND player_id = ?
       ORDER BY joined_at DESC
       LIMIT 1`,
    )
    .bind(mode, playerId)
    .first<QueueRow>();

  if (queueEntry) {
    const match = await findLiveMatchSince(
      db,
      mode,
      playerId,
      queueEntry.joined_at,
    );

    if (match) {
      await db
        .prepare(`DELETE FROM matchmaking_queue WHERE id = ?`)
        .bind(queueEntry.id)
        .run();

      return json({
        status: "matched",
        ...opponentFromMatch(match, playerId),
      });
    }

    if (queueEntry.expires_at >= nowIso()) {
      return json({ status: "waiting", joinedAt: queueEntry.joined_at });
    }
  }

  const recentMatch = await findLiveMatchSince(
    db,
    mode,
    playerId,
    new Date(Date.now() - QUEUE_TTL_SECONDS * 1000).toISOString(),
  );

  if (recentMatch) {
    return json({
      status: "matched",
      ...opponentFromMatch(recentMatch, playerId),
    });
  }

  return json({ status: "idle" }, 404);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const mode = parseMode(url.searchParams.get("mode"));
  const playerId = url.searchParams.get("playerId")?.trim();

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  await context.env.DB.prepare(
    `DELETE FROM matchmaking_queue WHERE mode = ? AND player_id = ?`,
  )
    .bind(mode, playerId)
    .run();

  return json({ status: "left" });
};
