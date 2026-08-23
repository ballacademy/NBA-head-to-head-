import type { Env } from "../types";
import { requirePlayerIdAuthority } from "../lib/accountSessions";
import {
  matchmakingModeError,
  parseMatchmakingMode,
} from "../lib/matchmakingMode";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const PENDING_RESULTS_LIMIT = 20;

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
}

const parseOwnerLineup = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
  } catch {
    return [];
  }
};

const serializeOwnerResult = (row: OwnerResultRow) => ({
  id: row.id,
  lineupId: row.lineup_id,
  mode: row.mode,
  ownerResult: row.owner_result,
  opponentTeamName: row.opponent_team_name,
  opponentElo: row.opponent_elo,
  ownerLineup: parseOwnerLineup(row.owner_lineup_json),
  ownerScore: row.owner_score,
  opponentScore: row.opponent_score,
  createdAt: row.created_at,
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const mode = parseMatchmakingMode(url.searchParams.get("mode"));
  const playerId = url.searchParams.get("playerId")?.trim();

  if (!mode) {
    return json({ error: matchmakingModeError() }, 400);
  }

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const auth = await requirePlayerIdAuthority(
    context.request,
    context.env.DB,
    playerId,
  );
  if (!auth.ok) {
    return auth.response;
  }

  const db = context.env.DB;

  // Only intentional live-queue submissions lock Pro play — not every ghost-pool save.
  const queuedLineup = await db
    .prepare(
      `SELECT id, created_at
       FROM stored_lineups
       WHERE mode = ?
         AND player_id = ?
         AND consumed_at IS NULL
         AND awaiting_live = 1
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(mode, playerId)
    .first<{ id: string; created_at: string }>();

  const pendingRows =
    mode === "classic" || mode === "ranked"
      ? (
          await db
            .prepare(
              `SELECT id, lineup_id, owner_player_id, mode, owner_result, opponent_team_name,
                      opponent_elo, owner_lineup_json, owner_score, opponent_score, created_at
               FROM owner_match_results
               WHERE owner_player_id = ?
                 AND mode = ?
                 AND acknowledged_at IS NULL
               ORDER BY created_at ASC
               LIMIT ?`,
            )
            .bind(playerId, mode, PENDING_RESULTS_LIMIT)
            .all<OwnerResultRow>()
        ).results ?? []
      : [];

  const pendingResults = pendingRows.map(serializeOwnerResult);

  return json({
    queuedLineup: queuedLineup
      ? { id: queuedLineup.id, createdAt: queuedLineup.created_at }
      : null,
    pendingResults,
    // Oldest unacked result — kept for older clients that only read a single item.
    pendingResult: pendingResults[0] ?? null,
  });
};

interface AckBody {
  resultId?: unknown;
  resultIds?: unknown;
  ackAll?: unknown;
  playerId?: unknown;
  mode?: unknown;
}

const parseResultIds = (body: AckBody): string[] => {
  if (Array.isArray(body.resultIds)) {
    return body.resultIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }

  if (typeof body.resultId === "string" && body.resultId.trim()) {
    return [body.resultId.trim()];
  }

  return [];
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: AckBody;

  try {
    body = (await context.request.json()) as AckBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const playerId =
    typeof body.playerId === "string" ? body.playerId.trim() : "";

  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const auth = await requirePlayerIdAuthority(
    context.request,
    context.env.DB,
    playerId,
  );
  if (!auth.ok) {
    return auth.response;
  }

  const acknowledgedAt = new Date().toISOString();
  const ackAll = body.ackAll === true;
  const mode = parseMatchmakingMode(
    typeof body.mode === "string" ? body.mode : null,
  );

  if (ackAll) {
    if (!mode || (mode !== "classic" && mode !== "ranked")) {
      return json(
        { error: "mode must be classic or ranked when ackAll is true" },
        400,
      );
    }

    await context.env.DB.prepare(
      `UPDATE owner_match_results
       SET acknowledged_at = ?
       WHERE owner_player_id = ? AND mode = ? AND acknowledged_at IS NULL`,
    )
      .bind(acknowledgedAt, playerId, mode)
      .run();

    return json({ ok: true });
  }

  const resultIds = parseResultIds(body);

  if (resultIds.length === 0) {
    return json(
      { error: "resultId or resultIds is required (or ackAll with mode)" },
      400,
    );
  }

  const placeholders = resultIds.map(() => "?").join(", ");
  await context.env.DB.prepare(
    `UPDATE owner_match_results
     SET acknowledged_at = ?
     WHERE owner_player_id = ?
       AND acknowledged_at IS NULL
       AND id IN (${placeholders})`,
  )
    .bind(acknowledgedAt, playerId, ...resultIds)
    .run();

  return json({ ok: true });
};
