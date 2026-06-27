import type { Env, MatchmakingMode, StoredLineupRow } from "../types";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parseMode = (value: unknown): MatchmakingMode | null =>
  value === "classic" || value === "ranked" ? value : null;

interface MatchResultBody {
  storedLineupId?: unknown;
  mode?: unknown;
  challengerPlayerId?: unknown;
  challengerTeamName?: unknown;
  challengerWon?: unknown;
  challengerElo?: unknown;
  userScore?: unknown;
  opponentScore?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: MatchResultBody;

  try {
    body = (await context.request.json()) as MatchResultBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const mode = parseMode(body.mode);
  const storedLineupId =
    typeof body.storedLineupId === "string" ? body.storedLineupId.trim() : "";
  const challengerPlayerId =
    typeof body.challengerPlayerId === "string"
      ? body.challengerPlayerId.trim()
      : "";
  const challengerTeamName =
    typeof body.challengerTeamName === "string"
      ? body.challengerTeamName.trim().slice(0, 32)
      : "";
  const challengerWon = body.challengerWon === true;
  const challengerElo = Number(body.challengerElo ?? 1000);
  const userScore = Number(body.userScore ?? 0);
  const opponentScore = Number(body.opponentScore ?? 0);

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  if (!storedLineupId || !challengerPlayerId || !challengerTeamName) {
    return json(
      { error: "storedLineupId, challengerPlayerId, and challengerTeamName are required" },
      400,
    );
  }

  if (!Number.isFinite(challengerElo)) {
    return json({ error: "challengerElo must be a number" }, 400);
  }

  const db = context.env.DB;
  const lineup = await db
    .prepare(
      `SELECT id, mode, player_id, team_name, lineup_json, elo, created_at, consumed_at
       FROM stored_lineups
       WHERE id = ?`,
    )
    .bind(storedLineupId)
    .first<StoredLineupRow & { consumed_at: string | null }>();

  if (!lineup || lineup.mode !== mode) {
    return json({ error: "stored lineup not found" }, 404);
  }

  if (lineup.player_id === challengerPlayerId) {
    return json({ error: "cannot score a match against your own lineup" }, 400);
  }

  if (lineup.consumed_at) {
    return json({ ok: true, duplicate: true });
  }

  const ownerResult = challengerWon ? "loss" : userScore === opponentScore ? "tie" : "win";
  const now = new Date().toISOString();
  const resultId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO owner_match_results (
        id, lineup_id, owner_player_id, mode, owner_result, opponent_team_name,
        opponent_elo, owner_lineup_json, owner_score, opponent_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      resultId,
      lineup.id,
      lineup.player_id,
      mode,
      ownerResult,
      challengerTeamName,
      Math.round(challengerElo),
      lineup.lineup_json,
      opponentScore,
      userScore,
      now,
    )
    .run();

  await db
    .prepare(
      `UPDATE stored_lineups
       SET consumed_at = ?, consumed_by = ?
       WHERE id = ?`,
    )
    .bind(now, challengerPlayerId, lineup.id)
    .run();

  return json({ id: resultId, ownerResult }, 201);
};
