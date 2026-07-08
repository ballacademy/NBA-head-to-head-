import type { Env, MatchmakingMode, StoredLineupRow } from "../types";
import { claimGhostOpponent } from "../lib/matchmakingDb";
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

  const opponent = await claimGhostOpponent(
    context.env.DB,
    mode,
    playerId,
    elo,
    rowToPayload,
  );

  if (!opponent) {
    return json({ error: "no opponent available" }, 404);
  }

  return json(opponent);
};
