import type { Env, MatchmakingMode } from "../types";
import { rejectProfaneTeamName } from "../lib/profanity";
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
  const elo = Number(body.elo ?? 1000);
  const awaitingLive = body.awaitingLive === true || body.awaitingLive === 1;
  const salaryTotal = Number(body.salaryTotal);
  const starCount = Number(body.starCount);
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

  if (!Number.isFinite(elo)) {
    return json({ error: "elo must be a number" }, 400);
  }

  if (!Number.isFinite(salaryTotal) || salaryTotal < 0) {
    return json({ error: "salaryTotal must be a non-negative number" }, 400);
  }

  if (!isStoredLineupWithinSalaryCap(mode, salaryTotal)) {
    return json(
      {
        error: `lineup salary exceeds the ${mode} cap of ${salaryCapForMatchmakingMode(mode)}`,
      },
      400,
    );
  }

  if (!Number.isFinite(starCount) || starCount < 0) {
    return json({ error: "starCount must be a non-negative number" }, 400);
  }

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
      Math.round(elo),
      createdAt,
      awaitingLive ? 1 : 0,
      Math.round(salaryTotal),
      Math.round(starCount),
    )
    .run();

  return json({ id, createdAt }, 201);
};
