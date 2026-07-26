import type { Env, MatchmakingMode, StoredLineupRow } from "../types";
import { computeLineupSalaryTotal } from "../lib/playerSalaries";
import {
  isStoredLineupWithinSalaryCap,
  isValidStoredLineupIds,
  parseStoredLineupJson,
  salaryCapForMatchmakingMode,
  sanitizeStoredLineupIds,
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

interface MatchResultBody {
  storedLineupId?: unknown;
  mode?: unknown;
  challengerPlayerId?: unknown;
  challengerTeamName?: unknown;
  challengerWon?: unknown;
  challengerElo?: unknown;
  userScore?: unknown;
  opponentScore?: unknown;
  challengerLineup?: unknown;
}

/** Owner result from submitted scores (challenger = userScore, owner = opponentScore). */
export const ownerResultFromScores = (
  challengerScore: number,
  ownerScore: number,
): "win" | "loss" | "tie" => {
  if (challengerScore === ownerScore) {
    return "tie";
  }

  return challengerScore > ownerScore ? "loss" : "win";
};

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
  const challengerElo = Number(body.challengerElo ?? 500);
  const userScore = Number(body.userScore ?? 0);
  const opponentScore = Number(body.opponentScore ?? 0);
  const challengerLineup = sanitizeStoredLineupIds(body.challengerLineup);

  if (!mode) {
    return json({ error: "mode must be classic or ranked" }, 400);
  }

  if (!storedLineupId || !challengerPlayerId || !challengerTeamName) {
    return json(
      {
        error:
          "storedLineupId, challengerPlayerId, and challengerTeamName are required",
      },
      400,
    );
  }

  if (!Number.isFinite(challengerElo)) {
    return json({ error: "challengerElo must be a number" }, 400);
  }

  if (!Number.isFinite(userScore) || !Number.isFinite(opponentScore)) {
    return json({ error: "userScore and opponentScore must be numbers" }, 400);
  }

  if (!isValidStoredLineupIds(challengerLineup)) {
    return json(
      {
        error:
          "challengerLineup must contain exactly 5 unique non-empty player ids",
      },
      400,
    );
  }

  const challengerSalary = computeLineupSalaryTotal(challengerLineup);

  if (challengerSalary.missing > 0) {
    return json(
      { error: "challengerLineup contains players without known contract salaries" },
      400,
    );
  }

  if (
    !isStoredLineupWithinSalaryCap(mode, Math.round(challengerSalary.total))
  ) {
    return json(
      {
        error: `challengerLineup salary exceeds the ${mode} cap of ${salaryCapForMatchmakingMode(mode)}`,
      },
      400,
    );
  }

  const db = context.env.DB;
  const lineup = await db
    .prepare(
      `SELECT id, mode, player_id, team_name, lineup_json, elo, created_at,
              consumed_at, claimed_by, claim_expires_at
       FROM stored_lineups
       WHERE id = ?`,
    )
    .bind(storedLineupId)
    .first<StoredLineupRow>();

  if (!lineup || lineup.mode !== mode) {
    return json({ error: "stored lineup not found" }, 404);
  }

  if (lineup.player_id === challengerPlayerId) {
    return json({ error: "cannot score a match against your own lineup" }, 400);
  }

  if (lineup.consumed_at) {
    return json({ ok: true, duplicate: true });
  }

  const nowMs = Date.now();
  const claimExpires = lineup.claim_expires_at
    ? Date.parse(lineup.claim_expires_at)
    : NaN;
  const claimActive =
    Boolean(lineup.claimed_by) &&
    Number.isFinite(claimExpires) &&
    claimExpires > nowMs;

  if (claimActive && lineup.claimed_by !== challengerPlayerId) {
    return json({ error: "stored lineup is claimed by another challenger" }, 409);
  }

  const ownerLineup = parseStoredLineupJson(lineup.lineup_json);

  if (!isValidStoredLineupIds(ownerLineup)) {
    return json({ error: "stored lineup is invalid" }, 400);
  }

  const now = new Date(nowMs).toISOString();
  // Recompute from scores; do not trust client challengerWon.
  const ownerResult = ownerResultFromScores(userScore, opponentScore);

  const consume = await db
    .prepare(
      `UPDATE stored_lineups
       SET consumed_at = ?, consumed_by = ?,
           claimed_by = NULL, claim_expires_at = NULL
       WHERE id = ? AND consumed_at IS NULL`,
    )
    .bind(now, challengerPlayerId, lineup.id)
    .run();

  if ((consume.meta?.changes ?? 0) === 0) {
    return json({ ok: true, duplicate: true });
  }

  await db
    .prepare(
      `INSERT INTO owner_match_results (
        id, lineup_id, owner_player_id, mode,
        owner_result, opponent_team_name, opponent_elo,
        owner_lineup_json, owner_score, opponent_score,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      lineup.id,
      lineup.player_id,
      mode,
      ownerResult,
      challengerTeamName,
      Math.round(challengerElo),
      lineup.lineup_json,
      Math.round(opponentScore),
      Math.round(userScore),
      now,
    )
    .run();

  return json({ ok: true, consumed: true, ownerResult }, 201);
};
