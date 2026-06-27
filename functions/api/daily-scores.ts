import type { Env } from "../types";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GOAL_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

const parseDateKey = (value: string | null) =>
  value && DATE_KEY_PATTERN.test(value) ? value : null;

const parseGoalId = (value: string | null) =>
  value && GOAL_ID_PATTERN.test(value) ? value : null;

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

interface DailyScoreBody {
  dateKey?: unknown;
  goalId?: unknown;
  playerId?: unknown;
  teamName?: unknown;
  value?: unknown;
  formattedResult?: unknown;
  lineup?: unknown;
}

interface DailyScoreRow {
  date_key: string;
  goal_id: string;
  player_id: string;
  team_name: string;
  value: number;
  formatted_result: string;
  lineup_json: string;
  submitted_at: string;
}

const rowToEntry = (row: DailyScoreRow) => ({
  playerId: row.player_id,
  goalId: row.goal_id,
  value: row.value,
  formattedResult: row.formatted_result,
  lineup: JSON.parse(row.lineup_json) as string[],
  teamName: row.team_name,
  submittedAt: row.submitted_at,
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const dateKey = parseDateKey(url.searchParams.get("dateKey"));
  const goalId = parseGoalId(url.searchParams.get("goalId"));
  const playerId = parsePlayerId(url.searchParams.get("playerId"));

  if (!dateKey || !goalId) {
    return json({ error: "dateKey and goalId are required" }, 400);
  }

  const db = context.env.DB;

  const valueRows = playerId
    ? await db
        .prepare(
          `SELECT value
           FROM daily_draft_scores
           WHERE date_key = ? AND goal_id = ? AND player_id != ?`,
        )
        .bind(dateKey, goalId, playerId)
        .all<{ value: number }>()
    : await db
        .prepare(
          `SELECT value
           FROM daily_draft_scores
           WHERE date_key = ? AND goal_id = ?`,
        )
        .bind(dateKey, goalId)
        .all<{ value: number }>();

  const countRow = await db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM daily_draft_scores
       WHERE date_key = ? AND goal_id = ?`,
    )
    .bind(dateKey, goalId)
    .first<{ total: number }>();

  let entry = null;

  if (playerId) {
    const playerRow = await db
      .prepare(
        `SELECT date_key, goal_id, player_id, team_name, value, formatted_result, lineup_json, submitted_at
         FROM daily_draft_scores
         WHERE date_key = ? AND goal_id = ? AND player_id = ?`,
      )
      .bind(dateKey, goalId, playerId)
      .first<DailyScoreRow>();

    entry = playerRow ? rowToEntry(playerRow) : null;
  }

  return json({
    dateKey,
    goalId,
    values: (valueRows.results ?? []).map((row) => row.value),
    totalDrafters: countRow?.total ?? 0,
    entry,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: DailyScoreBody;

  try {
    body = (await context.request.json()) as DailyScoreBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const dateKey = parseDateKey(
    typeof body.dateKey === "string" ? body.dateKey : null,
  );
  const goalId = parseGoalId(typeof body.goalId === "string" ? body.goalId : null);
  const playerId = parsePlayerId(body.playerId);
  const teamName =
    typeof body.teamName === "string" ? body.teamName.trim().slice(0, 32) : "";
  const formattedResult =
    typeof body.formattedResult === "string"
      ? body.formattedResult.trim().slice(0, 120)
      : "";
  const value = Number(body.value);
  const lineup = Array.isArray(body.lineup)
    ? body.lineup.filter((id): id is string => typeof id === "string")
    : [];

  if (!dateKey || !goalId) {
    return json({ error: "dateKey and goalId are required" }, 400);
  }

  if (!playerId || !teamName || !formattedResult) {
    return json(
      { error: "playerId, teamName, and formattedResult are required" },
      400,
    );
  }

  if (!Number.isFinite(value)) {
    return json({ error: "value must be a number" }, 400);
  }

  if (lineup.length !== 5) {
    return json({ error: "lineup must contain exactly 5 player ids" }, 400);
  }

  const submittedAt = new Date().toISOString();

  await context.env.DB.prepare(
    `INSERT INTO daily_draft_scores (
      date_key, goal_id, player_id, team_name, value, formatted_result, lineup_json, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date_key, goal_id, player_id) DO UPDATE SET
      team_name = excluded.team_name,
      value = excluded.value,
      formatted_result = excluded.formatted_result,
      lineup_json = excluded.lineup_json,
      submitted_at = excluded.submitted_at`,
  )
    .bind(
      dateKey,
      goalId,
      playerId,
      teamName,
      value,
      formattedResult,
      JSON.stringify(lineup),
      submittedAt,
    )
    .run();

  return json(
    {
      dateKey,
      goalId,
      entry: {
        playerId,
        goalId,
        value,
        formattedResult,
        lineup,
        teamName,
        submittedAt,
      },
    },
    201,
  );
};
