import type { Env, MatchmakingMode } from "../types";
import { rejectProfaneTeamName } from "../lib/profanity";
import { computeLineupSalaryTotal } from "../lib/playerSalaries";
import {
  isStoredLineupWithinSalaryCap,
  isValidStoredLineupIds,
  REQUIRED_STORED_LINEUP_SIZE,
  sanitizeStoredLineupIds,
  salaryCapForMatchmakingMode,
} from "../lib/storedLineups";

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

/** Upper bound for depositor-reported star depth (collection size safety). */
const MAX_STORED_STAR_COUNT = 40;

interface LineupBody {
  mode?: unknown;
  playerId?: unknown;
  teamName?: unknown;
  lineup?: unknown;
  elo?: unknown;
  practiceMode?: unknown;
  isPractice?: unknown;
  awaitingLive?: unknown;
  salaryTotal?: unknown;
  starCount?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: LineupBody;

  try {
    body = (await context.request.json()) as LineupBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const mode = parseMode(body.mode);
  const playerId =
    typeof body.playerId === "string" ? body.playerId.trim() : "";
  const teamName =
    typeof body.teamName === "string" ? body.teamName.trim().slice(0, 32) : "";
  const lineup = sanitizeStoredLineupIds(body.lineup);
  const awaitingLive = body.awaitingLive === true || body.awaitingLive === 1;
  const clientStarCount = Number(body.starCount);
  const isPractice =
    body.practiceMode === true ||
    body.isPractice === true ||
    body.practiceMode === "true" ||
    body.isPractice === "true";

  if (isPractice) {
    return json({ error: "practice lineups cannot be stored for matchmaking" }, 400);
  }

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  if (!playerId || !teamName) {
    return json({ error: "playerId and teamName are required" }, 400);
  }

  const profanityError = rejectProfaneTeamName(teamName);

  if (profanityError) {
    return json({ error: profanityError }, 400);
  }

  if (!isValidStoredLineupIds(lineup)) {
    return json(
      {
        error: `lineup must contain exactly ${REQUIRED_STORED_LINEUP_SIZE} unique non-empty player ids`,
      },
      400,
    );
  }

  const salary = computeLineupSalaryTotal(lineup);
  if (salary.missing > 0) {
    return json(
      { error: "lineup contains players without known contract salaries" },
      400,
    );
  }

  const salaryTotal = Math.round(salary.total);

  if (!isStoredLineupWithinSalaryCap(mode, salaryTotal)) {
    return json(
      {
        error: `lineup salary exceeds the ${mode} cap of ${salaryCapForMatchmakingMode(mode)}`,
      },
      400,
    );
  }

  if (!Number.isFinite(clientStarCount) || clientStarCount < 0) {
    return json({ error: "starCount must be a non-negative number" }, 400);
  }

  const starCount = Math.min(
    MAX_STORED_STAR_COUNT,
    Math.round(clientStarCount),
  );

  // Prefer server leaderboard Elo when available; otherwise accept a clamped client value.
  const leaderboard = await context.env.DB.prepare(
    `SELECT elo FROM leaderboard_entries
     WHERE mode = ? AND player_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
    .bind(mode, playerId)
    .first<{ elo: number }>();

  const clientElo = Number(body.elo ?? 1000);
  if (!leaderboard && !Number.isFinite(clientElo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  const elo = Math.round(
    leaderboard?.elo ?? Math.max(0, Math.min(4000, clientElo)),
  );

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await context.env.DB.prepare(
    `INSERT INTO stored_lineups (
      id, mode, player_id, team_name, lineup_json, elo, created_at,
      awaiting_live, salary_total, star_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      mode,
      playerId,
      teamName,
      JSON.stringify(lineup),
      elo,
      createdAt,
      awaitingLive ? 1 : 0,
      salaryTotal,
      starCount,
    )
    .run();

  return json({ id, createdAt, salaryTotal, elo, starCount }, 201);
};
