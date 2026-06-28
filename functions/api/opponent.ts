import type { Env, MatchmakingMode, StoredLineupRow } from "../types";
import {
  INVALID_STORED_LINEUP_CONSUMED_BY,
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

const parseMode = (value: string | null): MatchmakingMode | null =>
  value === "classic" || value === "ranked" ? value : null;

const cutoffIso = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
};

const rowToPayload = (row: StoredLineupRow) => {
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
  };
};

const markStoredLineupInvalid = async (db: D1Database, id: string) => {
  await db
    .prepare(
      `UPDATE stored_lineups
       SET consumed_at = ?, consumed_by = ?
       WHERE id = ? AND consumed_at IS NULL`,
    )
    .bind(new Date().toISOString(), INVALID_STORED_LINEUP_CONSUMED_BY, id)
    .run();
};

const findOpponentCandidates = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
  minElo: number,
  maxElo: number,
) => {
  const cutoff = cutoffIso(14);

  return db
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
};

const selectOpponent = async (
  db: D1Database,
  mode: MatchmakingMode,
  playerId: string,
  elo: number,
) => {
  const bands = [
    [Math.max(0, Math.round(elo) - 250), Math.round(elo) + 250],
    [0, 9999],
  ] as const;

  for (const [minElo, maxElo] of bands) {
    const candidates = await findOpponentCandidates(
      db,
      mode,
      playerId,
      minElo,
      maxElo,
    );

    for (const row of candidates.results ?? []) {
      const payload = rowToPayload(row);

      if (payload) {
        return payload;
      }

      await markStoredLineupInvalid(db, row.id);
    }
  }

  return null;
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

  const opponent = await selectOpponent(context.env.DB, mode, playerId, elo);

  if (!opponent) {
    return json({ error: "no opponent available" }, 404);
  }

  return json(opponent);
};
