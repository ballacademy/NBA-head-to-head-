import type { Env, MatchmakingMode, StoredLineupRow } from "../types";

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

interface OwnerResultRow {
  id: string;
  lineup_id: string;
  owner_player_id: string;
  mode: string;
  owner_result: string;
  opponent_team_name: string;
  opponent_elo: number;
  owner_lineup_json: string;
  owner_score: number;
  opponent_score: number;
  created_at: string;
  acknowledged_at: string | null;
}

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

  const queuedLineup = await db
    .prepare(
      `SELECT id, created_at
       FROM stored_lineups
       WHERE mode = ?
         AND player_id = ?
         AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(mode, playerId)
    .first<Pick<StoredLineupRow, "id" | "created_at">>();

  const pendingResult = await db
    .prepare(
      `SELECT id, lineup_id, owner_player_id, mode, owner_result, opponent_team_name,
              opponent_elo, owner_lineup_json, owner_score, opponent_score, created_at
       FROM owner_match_results
       WHERE owner_player_id = ?
         AND mode = ?
         AND acknowledged_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(playerId, mode)
    .first<OwnerResultRow>();

  return json({
    queuedLineup: queuedLineup
      ? { id: queuedLineup.id, createdAt: queuedLineup.created_at }
      : null,
    pendingResult: pendingResult
      ? {
          id: pendingResult.id,
          lineupId: pendingResult.lineup_id,
          mode: pendingResult.mode,
          ownerResult: pendingResult.owner_result,
          opponentTeamName: pendingResult.opponent_team_name,
          opponentElo: pendingResult.opponent_elo,
          ownerLineup: JSON.parse(pendingResult.owner_lineup_json) as string[],
          ownerScore: pendingResult.owner_score,
          opponentScore: pendingResult.opponent_score,
          createdAt: pendingResult.created_at,
        }
      : null,
  });
};

interface AckBody {
  resultId?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: AckBody;

  try {
    body = (await context.request.json()) as AckBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const resultId = typeof body.resultId === "string" ? body.resultId.trim() : "";

  if (!resultId) {
    return json({ error: "resultId is required" }, 400);
  }

  await context.env.DB.prepare(
    `UPDATE owner_match_results
     SET acknowledged_at = ?
     WHERE id = ? AND acknowledged_at IS NULL`,
  )
    .bind(new Date().toISOString(), resultId)
    .run();

  return json({ ok: true });
};
