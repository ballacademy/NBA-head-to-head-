import type { Env, MatchmakingMode } from "../types";
import { validateEventLineupIds } from "../lib/eventLineupValidation";
import { computeLineupSalaryTotal } from "../lib/playerSalaries";
import { parseMatchmakingMode } from "../lib/matchmakingMode";
import { getUsernameByPlayerId } from "../lib/playerAccounts";
import {
  isStoredLineupWithinSalaryCap,
  isValidStoredLineupIds,
  salaryCapForMatchmakingMode,
  sanitizeStoredLineupIds,
} from "../lib/storedLineups";

/** Must stay in sync with src/lib/liveAutofillLineup.ts */
export const LIVE_MATCH_LINEUP_WAIT_MS = 120_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parseMode = parseMatchmakingMode;

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

const buildMatchPayload = async (
  db: D1Database,
  row: LiveMatchRow,
  playerId: string,
) => {
  const isPlayerA = row.player_a_id === playerId;
  const selfLineup = parseLineup(
    isPlayerA ? row.player_a_lineup_json : row.player_b_lineup_json,
  );
  const opponentLineup = parseLineup(
    isPlayerA ? row.player_b_lineup_json : row.player_a_lineup_json,
  );
  const selfReady = Boolean(selfLineup && selfLineup.length === 5);
  const opponentReady = Boolean(opponentLineup && opponentLineup.length === 5);
  // Only reveal opponent picks once both sides have locked a lineup.
  const revealOpponent = selfReady && opponentReady;
  const opponentPlayerId = isPlayerA ? row.player_b_id : row.player_a_id;

  return {
    matchId: row.id,
    mode: row.mode,
    opponentTeamName: isPlayerA ? row.player_b_team : row.player_a_team,
    opponentElo: isPlayerA ? row.player_b_elo : row.player_a_elo,
    opponentPlayerId,
    opponentUsername: await getUsernameByPlayerId(db, opponentPlayerId),
    selfReady,
    opponentReady,
    selfLineup: selfReady ? selfLineup : null,
    opponentLineup: revealOpponent ? opponentLineup : null,
    createdAt: row.created_at,
  };
};

const loadLiveMatch = async (db: D1Database, matchId: string) =>
  db
    .prepare(
      `SELECT id, mode,
            player_a_id, player_a_team, player_a_elo, player_a_lineup_json, player_a_ready_at,
            player_b_id, player_b_team, player_b_elo, player_b_lineup_json, player_b_ready_at,
            created_at
     FROM live_matches
     WHERE id = ?`,
    )
    .bind(matchId)
    .first<LiveMatchRow>();

const validateLineupForMode = (mode: MatchmakingMode, lineup: string[]) => {
  if (!isValidStoredLineupIds(lineup)) {
    return {
      error: "lineup must contain exactly 5 unique non-empty player ids",
      status: 400,
    } as const;
  }

  const salary = computeLineupSalaryTotal(lineup);

  if (salary.missing > 0) {
    return {
      error: "lineup contains players without known contract salaries",
      status: 400,
    } as const;
  }

  if (!isStoredLineupWithinSalaryCap(mode, Math.round(salary.total))) {
    return {
      error: `lineup salary exceeds the ${mode} cap of ${salaryCapForMatchmakingMode(mode)}`,
      status: 400,
    } as const;
  }

  if (mode === "event") {
    const eventError = validateEventLineupIds(lineup);
    if (eventError) {
      return { error: eventError, status: 400 } as const;
    }
  }

  return null;
};

interface LiveMatchBody {
  matchId?: unknown;
  playerId?: unknown;
  lineup?: unknown;
  autofillOpponentLineup?: unknown;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const matchId = url.searchParams.get("matchId")?.trim();
  const playerId = url.searchParams.get("playerId")?.trim();

  if (!matchId || !playerId) {
    return json({ error: "matchId and playerId are required" }, 400);
  }

  const row = await loadLiveMatch(context.env.DB, matchId);

  if (!row) {
    return json({ error: "match not found" }, 404);
  }

  if (row.player_a_id !== playerId && row.player_b_id !== playerId) {
    return json({ error: "player not in match" }, 403);
  }

  return json(await buildMatchPayload(context.env.DB, row, playerId));
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
  const lineup = sanitizeStoredLineupIds(body.lineup);
  const autofillOpponent = body.autofillOpponentLineup === true;

  if (!matchId || !playerId) {
    return json({ error: "matchId and playerId are required" }, 400);
  }

  const row = await loadLiveMatch(context.env.DB, matchId);

  if (!row) {
    return json({ error: "match not found" }, 404);
  }

  const mode = parseMode(row.mode);

  if (!mode) {
    return json({ error: "match mode is invalid" }, 400);
  }

  const isPlayerA = row.player_a_id === playerId;
  const isPlayerB = row.player_b_id === playerId;

  if (!isPlayerA && !isPlayerB) {
    return json({ error: "player not in match" }, 403);
  }

  if (autofillOpponent) {
    const selfLineupJson = isPlayerA
      ? row.player_a_lineup_json
      : row.player_b_lineup_json;
    const selfReadyAt = isPlayerA
      ? row.player_a_ready_at
      : row.player_b_ready_at;
    const opponentLineupJson = isPlayerA
      ? row.player_b_lineup_json
      : row.player_a_lineup_json;
    const opponentPlayerId = isPlayerA ? row.player_b_id : row.player_a_id;

    if (!selfLineupJson || !selfReadyAt) {
      return json(
        { error: "lock your own lineup before autofilling the opponent" },
        400,
      );
    }

    // Already locked (real submit or earlier autofill) — return shared state.
    if (opponentLineupJson) {
      return json(await buildMatchPayload(context.env.DB, row, playerId));
    }

    const readyAtMs = Date.parse(selfReadyAt);

    if (
      !Number.isFinite(readyAtMs) ||
      Date.now() - readyAtMs < LIVE_MATCH_LINEUP_WAIT_MS
    ) {
      return json(
        { error: "opponent still has time to finish drafting" },
        409,
      );
    }

    const lineupError = validateLineupForMode(mode, lineup);

    if (lineupError) {
      return json({ error: lineupError.error }, lineupError.status);
    }

    const now = new Date().toISOString();
    const lineupJson = JSON.stringify(lineup);

    const locked = isPlayerA
      ? await context.env.DB.prepare(
          `UPDATE live_matches
           SET player_b_lineup_json = ?, player_b_ready_at = ?
           WHERE id = ? AND player_b_id = ? AND player_b_lineup_json IS NULL`,
        )
          .bind(lineupJson, now, matchId, opponentPlayerId)
          .run()
      : await context.env.DB.prepare(
          `UPDATE live_matches
           SET player_a_lineup_json = ?, player_a_ready_at = ?
           WHERE id = ? AND player_a_id = ? AND player_a_lineup_json IS NULL`,
        )
          .bind(lineupJson, now, matchId, opponentPlayerId)
          .run();

    // Race: opponent submitted, or another tab autofilled first.
    if ((locked.meta?.changes ?? 0) === 0) {
      const raced = await loadLiveMatch(context.env.DB, matchId);

      if (!raced) {
        return json({ error: "match not found" }, 404);
      }

      return json(await buildMatchPayload(context.env.DB, raced, playerId));
    }

    const updated = await loadLiveMatch(context.env.DB, matchId);

    if (!updated) {
      return json({ error: "match not found" }, 404);
    }

    return json(await buildMatchPayload(context.env.DB, updated, playerId));
  }

  const lineupError = validateLineupForMode(mode, lineup);

  if (lineupError) {
    return json({ error: lineupError.error }, lineupError.status);
  }

  const now = new Date().toISOString();
  const lineupJson = JSON.stringify(lineup);

  if (isPlayerA) {
    if (row.player_a_lineup_json) {
      return json({ error: "lineup is already locked for this match" }, 409);
    }

    const locked = await context.env.DB.prepare(
      `UPDATE live_matches
       SET player_a_lineup_json = ?, player_a_ready_at = ?
       WHERE id = ? AND player_a_id = ? AND player_a_lineup_json IS NULL`,
    )
      .bind(lineupJson, now, matchId, playerId)
      .run();

    if ((locked.meta?.changes ?? 0) === 0) {
      return json({ error: "lineup is already locked for this match" }, 409);
    }
  } else {
    if (row.player_b_lineup_json) {
      return json({ error: "lineup is already locked for this match" }, 409);
    }

    const locked = await context.env.DB.prepare(
      `UPDATE live_matches
       SET player_b_lineup_json = ?, player_b_ready_at = ?
       WHERE id = ? AND player_b_id = ? AND player_b_lineup_json IS NULL`,
    )
      .bind(lineupJson, now, matchId, playerId)
      .run();

    if ((locked.meta?.changes ?? 0) === 0) {
      return json({ error: "lineup is already locked for this match" }, 409);
    }
  }

  const updated = await loadLiveMatch(context.env.DB, matchId);

  if (!updated) {
    return json({ error: "match not found" }, 404);
  }

  return json(await buildMatchPayload(context.env.DB, updated, playerId));
};
