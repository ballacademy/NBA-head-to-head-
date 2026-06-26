import type { Env, MatchmakingMode, StoredLineupRow } from "../types";

const ELO_BAND = 250;
const MAX_AGE_DAYS = 14;

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

const cutoffIso = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
};

const rowToPayload = (row: StoredLineupRow) => ({
  id: row.id,
  teamName: row.team_name,
  lineup: JSON.parse(row.lineup_json) as string[],
  elo: row.elo,
  createdAt: row.created_at,
});

const findOpponent = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
  elo: number,
  minElo: number,
  maxElo: number,
) => {
  const cutoff = cutoffIso(MAX_AGE_DAYS);

  return db
    .prepare(
      `SELECT id, mode, player_id, team_name, lineup_json, elo, created_at
       FROM stored_lineups
       WHERE mode = ?
         AND player_id != ?
         AND elo BETWEEN ? AND ?
         AND created_at >= ?
       ORDER BY RANDOM()
       LIMIT 1`,
    )
    .bind(mode, playerId, minElo, maxElo, cutoff)
    .first<StoredLineupRow>();
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const mode = parseMode(url.searchParams.get("mode"));

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  const playerId = url.searchParams.get("playerId")?.trim();
  const elo = Number(url.searchParams.get("elo") ?? "1000");

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  if (!Number.isFinite(elo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  const db = context.env.DB;
  let row =
    (await findOpponent(
      db,
      mode,
      playerId,
      elo,
      Math.max(0, Math.round(elo) - ELO_BAND),
      Math.round(elo) + ELO_BAND,
    )) ??
    (await findOpponent(db, mode, playerId, elo, 0, 9999));

  if (!row) {
    return json({ error: "no opponent available" }, 404);
  }

  return json(rowToPayload(row));
};
