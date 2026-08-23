import type { Env, MatchmakingMode } from "../types";
import { claimQueueOpponentAndCreateMatch } from "../lib/matchmakingDb";
import { resolveServerMatchmakingElo } from "../lib/matchmakingElo";
import {
  matchmakingModeError,
  parseMatchmakingMode,
} from "../lib/matchmakingMode";
import { getUsernameByPlayerId } from "../lib/playerAccounts";
import { rejectProfaneTeamName } from "../lib/profanity";

const QUEUE_TTL_SECONDS = 45;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parseMode = parseMatchmakingMode;

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

/**
 * Recent live match that is still joinable (neither side has submitted a
 * lineup). Cancel/timeout polls must not reattach into finished drafts.
 */
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
         AND player_a_lineup_json IS NULL
         AND player_b_lineup_json IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(mode, playerId, playerId, sinceIso)
    .first<LiveMatchRow>();

const opponentFromMatch = async (
  db: D1Database,
  match: LiveMatchRow,
  playerId: string,
) => {
  const opponentPlayerId =
    match.player_a_id === playerId ? match.player_b_id : match.player_a_id;
  const teamName =
    match.player_a_id === playerId ? match.player_b_team : match.player_a_team;
  const elo =
    match.player_a_id === playerId ? match.player_b_elo : match.player_a_elo;

  return {
    matchId: match.id,
    teamName,
    elo,
    playerId: opponentPlayerId,
    username: await getUsernameByPlayerId(db, opponentPlayerId),
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
  const clientElo = Number(body.elo ?? 1000);

  if (!mode) {
    return json({ error: matchmakingModeError() }, 400);
  }

  if (!playerId || !teamName) {
    return json({ error: "playerId and teamName are required" }, 400);
  }

  const profanityError = rejectProfaneTeamName(teamName);

  if (profanityError) {
    return json({ error: profanityError }, 400);
  }

  if (!Number.isFinite(clientElo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  const db = context.env.DB;
  const elo = await resolveServerMatchmakingElo(db, {
    mode,
    playerId,
    clientElo,
  });

  await cleanupExpiredQueue(db);
  const now = nowIso();

  const matched = await claimQueueOpponentAndCreateMatch(
    db,
    mode,
    { playerId, teamName, elo },
    now,
  );

  if (matched) {
    return json({
      status: "matched",
      matchId: matched.matchId,
      opponent: {
        teamName: matched.opponent.team_name,
        elo: matched.opponent.elo,
        playerId: matched.opponent.player_id,
        username: await getUsernameByPlayerId(db, matched.opponent.player_id),
      },
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
      elo,
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
    return json({ error: matchmakingModeError() }, 400);
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
        ...(await opponentFromMatch(db, match, playerId)),
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
      ...(await opponentFromMatch(db, recentMatch, playerId)),
    });
  }

  return json({ status: "idle" }, 404);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const mode = parseMode(url.searchParams.get("mode"));
  const playerId = url.searchParams.get("playerId")?.trim();

  if (!mode) {
    return json({ error: matchmakingModeError() }, 400);
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
