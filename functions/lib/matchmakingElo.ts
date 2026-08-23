import { getAccountByPlayerId } from "./playerAccounts";
import type { MatchmakingMode } from "../types";
import { GUEST_RANKED_ELO_CAP } from "../../src/lib/rankedElo";
import { getCurrentSeasonId } from "../../src/lib/rankedSeason";

const MAX_MATCHMAKING_ELO = 4000;

/** Clamp any client-supplied Elo into the safe display/matchmaking range. */
export const clampClientMatchmakingElo = (value: number) =>
  Math.max(0, Math.min(MAX_MATCHMAKING_ELO, Math.round(value)));

/**
 * Prefer the current-season leaderboard Elo when present. Otherwise clamp the
 * client value, and for ranked guests apply {@link GUEST_RANKED_ELO_CAP}.
 *
 * Note: without session auth, a caller can still spoof another linked playerId.
 * This only removes client-only Elo spoofing for guests and clamps extremes.
 */
export const resolveServerMatchmakingElo = async (
  db: D1Database,
  params: {
    mode: MatchmakingMode;
    playerId: string;
    clientElo: number;
  },
): Promise<number> => {
  const clientFallback = clampClientMatchmakingElo(params.clientElo);

  if (params.mode === "classic" || params.mode === "ranked") {
    const seasonId = getCurrentSeasonId();
    const row = await db
      .prepare(
        `SELECT elo FROM leaderboard_entries
         WHERE mode = ? AND season_id = ? AND player_id = ?
         LIMIT 1`,
      )
      .bind(params.mode, seasonId, params.playerId)
      .first<{ elo: number }>();

    if (row && Number.isFinite(row.elo)) {
      return clampClientMatchmakingElo(row.elo);
    }
  } else if (params.mode === "event") {
    const row = await db
      .prepare(
        `SELECT elo FROM leaderboard_entries
         WHERE mode = 'event' AND player_id = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
      )
      .bind(params.playerId)
      .first<{ elo: number }>();

    if (row && Number.isFinite(row.elo)) {
      return clampClientMatchmakingElo(row.elo);
    }
  }

  if (params.mode === "ranked") {
    const account = await getAccountByPlayerId(db, params.playerId);
    if (!account) {
      return Math.min(clientFallback, GUEST_RANKED_ELO_CAP);
    }
  }

  return clientFallback;
};
