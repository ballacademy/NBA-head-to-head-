import type { Env, MatchmakingMode, StoredLineupRow } from "../types";
import { scoreLineupIds } from "../lib/lineupScoring";
import { computeLineupSalaryTotal } from "../lib/playerSalaries";
import {
  matchmakingModeError,
  parseMatchmakingMode,
} from "../lib/matchmakingMode";
import {
  isStoredLineupWithinSalaryCap,
  isValidStoredLineupIds,
  parseStoredLineupJson,
  salaryCapForMatchmakingMode,
  sanitizeStoredLineupIds,
} from "../lib/storedLineups";
import {
  lineupContainsRankedEventBannedPlayer,
  matchmakingModeBansRankedEventPlayers,
  rankedEventBannedPlayerError,
} from "../../src/lib/competitivePlayerBans";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parseMode = parseMatchmakingMode;

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

/** Persist uncapped OVR with stable milli-precision (no integer rounding). */
export const persistMatchScore = (score: number) =>
  Math.round(score * 1000) / 1000;

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
  // Client userScore/opponentScore are ignored for W/L; server recomputes.
  const challengerLineup = sanitizeStoredLineupIds(body.challengerLineup);

  if (!mode) {
    return json({ error: matchmakingModeError() }, 400);
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

  if (
    matchmakingModeBansRankedEventPlayers(mode) &&
    lineupContainsRankedEventBannedPlayer(challengerLineup)
  ) {
    return json({ error: rankedEventBannedPlayerError() }, 400);
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

  const challengerScore = scoreLineupIds(challengerLineup);
  const ownerScore = scoreLineupIds(ownerLineup);

  if (challengerScore == null || ownerScore == null) {
    return json(
      { error: "could not score lineup; one or more player ids are unknown" },
      400,
    );
  }

  const now = new Date(nowMs).toISOString();
  // Server-side scores only; do not trust client userScore/opponentScore/challengerWon.
  const ownerResult = ownerResultFromScores(challengerScore, ownerScore);

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
      persistMatchScore(ownerScore),
      persistMatchScore(challengerScore),
      now,
    )
    .run();

  return json({ ok: true, consumed: true, ownerResult }, 201);
};
