import type { Env, MatchmakingMode } from "../types";

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

interface LiveMatchRow {
  id: string;
  mode: string;
  player_a_id: string;
  player_a_team: string;
  player_a_elo: number;
  player_a_lineup_json: string | null;
  player_a_ready_at: string | null;
  player_b_id: string;
  player_b_team: string;
  player_b_elo: number;
  player_b_lineup_json: string | null;
  player_b_ready_at: string | null;
  created_at: string;
}

const parseLineup = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return null;
  }
};

const buildMatchPayload = (row: LiveMatchRow, playerId: string) => {
  const isPlayerA = row.player_a_id === playerId;
  const selfLineup = parseLineup(
    isPlayerA ? row.player_a_lineup_json : row.player_b_lineup_json,
  );
  const opponentLineup = parseLineup(
    isPlayerA ? row.player_b_lineup_json : row.player_a_lineup_json,
  );

  return {
    matchId: row.id,
    mode: row.mode,
    opponentTeamName: isPlayerA ? row.player_b_team : row.player_a_team,
    opponentElo: isPlayerA ? row.player_b_elo : row.player_a_elo,
    opponentPlayerId: isPlayerA ? row.player_b_id : row.player_a_id,
    selfReady: Boolean(selfLineup && selfLineup.length === 5),
    opponentReady: Boolean(opponentLineup && opponentLineup.length === 5),
    opponentLineup,
    createdAt: row.created_at,
  };
};

interface LiveMatchBody {
  matchId?: unknown;
  playerId?: unknown;
  lineup?: unknown;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const matchId = url.searchParams.get("matchId")?.trim();
  const playerId = url.searchParams.get("playerId")?.trim();

  if (!matchId || !playerId) {
    return json({ error: "matchId and playerId are required" }, 400);
  }

  const row = await context.env.DB.prepare(
    `SELECT id, mode,
            player_a_id, player_a_team, player_a_elo, player_a_lineup_json, player_a_ready_at,
            player_b_id, player_b_team, player_b_elo, player_b_lineup_json, player_b_ready_at,
            created_at
     FROM live_matches
     WHERE id = ?`,
  )
    .bind(matchId)
    .first<LiveMatchRow>();

  if (!row) {
    return json({ error: "match not found" }, 404);
  }

  if (row.player_a_id !== playerId && row.player_b_id !== playerId) {
    return json({ error: "player not in match" }, 403);
  }

  return json(buildMatchPayload(row, playerId));
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: LiveMatchBody;

  try {
    body = (await context.request.json()) as LiveMatchBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
  const playerId =
    typeof body.playerId === "string" ? body.playerId.trim() : "";
  const lineup = Array.isArray(body.lineup)
    ? body.lineup.filter((id): id is string => typeof id === "string")
    : [];

  if (!matchId || !playerId) {
    return json({ error: "matchId and playerId are required" }, 400);
  }

  if (lineup.length !== 5) {
    return json({ error: "lineup must contain exactly 5 player ids" }, 400);
  }

  const row = await context.env.DB.prepare(
    `SELECT id, mode,
            player_a_id, player_a_team, player_a_elo, player_a_lineup_json, player_a_ready_at,
            player_b_id, player_b_team, player_b_elo, player_b_lineup_json, player_b_ready_at,
            created_at
     FROM live_matches
     WHERE id = ?`,
  )
    .bind(matchId)
    .first<LiveMatchRow>();

  if (!row) {
    return json({ error: "match not found" }, 404);
  }

  const now = new Date().toISOString();
  const lineupJson = JSON.stringify(lineup);

  if (row.player_a_id === playerId) {
    await context.env.DB.prepare(
      `UPDATE live_matches
       SET player_a_lineup_json = ?, player_a_ready_at = ?
       WHERE id = ?`,
    )
      .bind(lineupJson, now, matchId)
      .run();
  } else if (row.player_b_id === playerId) {
    await context.env.DB.prepare(
      `UPDATE live_matches
       SET player_b_lineup_json = ?, player_b_ready_at = ?
       WHERE id = ?`,
    )
      .bind(lineupJson, now, matchId)
      .run();
  } else {
    return json({ error: "player not in match" }, 403);
  }

  const updated = await context.env.DB.prepare(
    `SELECT id, mode,
            player_a_id, player_a_team, player_a_elo, player_a_lineup_json, player_a_ready_at,
            player_b_id, player_b_team, player_b_elo, player_b_lineup_json, player_b_ready_at,
            created_at
     FROM live_matches
     WHERE id = ?`,
  )
    .bind(matchId)
    .first<LiveMatchRow>();

  if (!updated) {
    return json({ error: "match not found" }, 404);
  }

  return json(buildMatchPayload(updated, playerId));
};
