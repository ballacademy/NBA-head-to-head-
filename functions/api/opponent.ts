import type { Env, MatchmakingMode, StoredLineupRow } from "../types";
import {
  claimGhostOpponent,
  releaseGhostOpponentClaim,
} from "../lib/matchmakingDb";
import { toPublicLeaderboardPlayerId } from "../lib/leaderboardPublicId";
import {
  matchmakingModeError,
  parseMatchmakingMode,
} from "../lib/matchmakingMode";
import { getUsernameByPlayerId } from "../lib/playerAccounts";
import {
  isValidStoredLineupIds,
  parseStoredLineupJson,
} from "../lib/storedLineups";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parseMode = parseMatchmakingMode;

const rowToPayload = async (db: D1Database, row: StoredLineupRow) => {
  const lineup = parseStoredLineupJson(row.lineup_json);

  if (!isValidStoredLineupIds(lineup)) {
    return null;
  }

  return {
    id: row.id,
    teamName: row.team_name,
    lineup,
    elo: row.elo,
    createdAt: row.created_at,
    publicPlayerId: await toPublicLeaderboardPlayerId(row.player_id),
    username: await getUsernameByPlayerId(db, row.player_id),
  };
};

const resolveChallengerStarCount = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
  clientStarCount: number,
) => {
  const clampedClient = Math.max(0, Math.round(clientStarCount));
  const recent = await db
    .prepare(
      `SELECT star_count
       FROM stored_lineups
       WHERE mode = ? AND player_id = ? AND star_count IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(mode, playerId)
    .first<{ star_count: number }>();

  if (recent && Number.isFinite(recent.star_count)) {
    // Prefer the higher count so under-reporting cannot loosen the star gap.
    return Math.max(clampedClient, Math.max(0, Math.round(recent.star_count)));
  }

  return clampedClient;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const mode = parseMode(url.searchParams.get("mode"));

  if (!mode) {
    return json({ error: matchmakingModeError() }, 400);
  }

  const playerId = url.searchParams.get("playerId")?.trim();
  const elo = Number(url.searchParams.get("elo") ?? "1000");
  const starCountParam = Number(url.searchParams.get("starCount") ?? "0");

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  if (!Number.isFinite(elo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  if (!Number.isFinite(starCountParam) || starCountParam < 0) {
    return json({ error: "starCount must be a non-negative number" }, 400);
  }

  const challengerStarCount = await resolveChallengerStarCount(
    context.env.DB,
    mode,
    playerId,
    starCountParam,
  );

  const opponent = await claimGhostOpponent(
    context.env.DB,
    mode,
    playerId,
    elo,
    challengerStarCount,
    (row) => rowToPayload(context.env.DB, row),
  );

  if (!opponent) {
    return json({ error: "no opponent available" }, 404);
  }

  return json(opponent);
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

  await releaseGhostOpponentClaim(context.env.DB, mode, playerId);
  return json({ ok: true });
};
