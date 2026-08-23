import type { Env } from "../types";
import { requireLinkedAccountSession } from "../lib/accountSessions";
import { parseDailyLineupJson, parseDailyMode } from "../lib/dailyScoresDb";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

/** Cap history so streak restore stays light (~200 days × 2 modes). */
const HISTORY_LIMIT = 400;

interface HistoryRow {
  date_key: string;
  goal_id: string;
  mode: string;
  player_id: string;
  team_name: string;
  value: number;
  formatted_result: string;
  lineup_json: string;
  submitted_at: string;
}

/**
 * Account-gated history of a player's Daily Draft submissions.
 * Used to restore play streaks across logout / devices.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const requestedPlayerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!requestedPlayerId) {
    return json({ error: "playerId is required" }, 400);
  }

  if (!context.env.DB) {
    return json({ error: "database unavailable" }, 503);
  }

  const auth = await requireLinkedAccountSession(
    context.request,
    context.env.DB,
    requestedPlayerId,
  );
  if (!auth.ok) return auth.response;
  const { playerId } = auth;

  const rows = await context.env.DB.prepare(
    `SELECT date_key, goal_id, mode, player_id, team_name, value,
            formatted_result, lineup_json, submitted_at
     FROM daily_draft_scores
     WHERE player_id = ?
     ORDER BY date_key DESC, submitted_at DESC
     LIMIT ?`,
  )
    .bind(playerId, HISTORY_LIMIT)
    .all<HistoryRow>();

  const entries = (rows.results ?? [])
    .map((row) => {
      const lineup = parseDailyLineupJson(row.lineup_json);
      if (!lineup) {
        return null;
      }

      return {
        dateKey: row.date_key,
        playerId: row.player_id,
        goalId: row.goal_id,
        mode: parseDailyMode(row.mode),
        value: row.value,
        formattedResult: row.formatted_result,
        lineup,
        teamName: row.team_name,
        submittedAt: row.submitted_at,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);

  return json({
    playerId,
    entries,
  });
};
