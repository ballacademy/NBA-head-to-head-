import type { HeadToHeadResult } from "./playerRecord";

export interface SeasonLeaderboardStats {
  wins: number;
  losses: number;
  ties: number;
  winStreak: number;
  lossStreak: number;
}

export interface SeasonLeaderboardBase {
  wins: number;
  losses: number;
  ties?: number;
  winStreak: number;
  lossStreak: number;
}

const gamesPlayed = (row: SeasonLeaderboardBase) =>
  row.wins + row.losses + (row.ties ?? 0);

const singleMatchStats = (
  result: HeadToHeadResult,
  countTowardStreak: boolean,
  preservedWinStreak = 0,
  preservedLossStreak = 0,
): SeasonLeaderboardStats => {
  if (result === "tie") {
    return {
      wins: 0,
      losses: 0,
      ties: 1,
      winStreak: preservedWinStreak,
      lossStreak: preservedLossStreak,
    };
  }

  if (!countTowardStreak) {
    return result === "win"
      ? {
          wins: 1,
          losses: 0,
          ties: 0,
          winStreak: preservedWinStreak,
          lossStreak: preservedLossStreak,
        }
      : {
          wins: 0,
          losses: 1,
          ties: 0,
          winStreak: preservedWinStreak,
          lossStreak: preservedLossStreak,
        };
  }

  return result === "win"
    ? { wins: 1, losses: 0, ties: 0, winStreak: 1, lossStreak: 0 }
    : { wins: 0, losses: 1, ties: 0, winStreak: 0, lossStreak: 1 };
};

const incrementExisting = (
  existing: SeasonLeaderboardBase,
  result: HeadToHeadResult,
  countTowardStreak: boolean,
): SeasonLeaderboardStats => {
  const ties = existing.ties ?? 0;

  if (result === "tie") {
    return {
      wins: existing.wins,
      losses: existing.losses,
      ties: ties + 1,
      winStreak: existing.winStreak,
      lossStreak: existing.lossStreak,
    };
  }

  if (result === "win") {
    return {
      wins: existing.wins + 1,
      losses: existing.losses,
      ties,
      winStreak: countTowardStreak ? existing.winStreak + 1 : existing.winStreak,
      lossStreak: countTowardStreak ? 0 : existing.lossStreak,
    };
  }

  return {
    wins: existing.wins,
    losses: existing.losses + 1,
    ties,
    winStreak: countTowardStreak ? 0 : existing.winStreak,
    lossStreak: countTowardStreak
      ? existing.lossStreak + 1
      : existing.lossStreak,
  };
};

/**
 * Build monthly/event-board W–L–T from the prior season row + this match.
 * Career modeRecords must not be posted to season leaderboards — the API
 * rejects first inserts with more than one game when no D1 row exists yet.
 *
 * When the local season row is missing or desynced from profile games played,
 * never invent an all-wins / all-losses catch-up from `priorSeasonGames`
 * (that produced fake boards like 63-1). Prefer advancing a known row by one
 * match, or starting from this match only.
 *
 * Ties count as games (and as the T in W–L–T) so Play/Ranks stay in sync with
 * career after a draw. Remote monthly APIs still persist W–L only.
 */
export const nextSeasonLeaderboardStats = (params: {
  existing: SeasonLeaderboardBase | null | undefined;
  result: HeadToHeadResult;
  /** Season games already played before this match (0 on a fresh monthly board). */
  priorSeasonGames: number;
  /**
   * When false (stored-lineup owner results), update W–L only and leave
   * win/loss streaks unchanged. Live matches keep the default true.
   */
  countTowardStreak?: boolean;
}): SeasonLeaderboardStats => {
  const { result, priorSeasonGames } = params;
  const countTowardStreak = params.countTowardStreak !== false;
  const existing = params.existing;
  const existingGames = existing ? gamesPlayed(existing) : 0;
  const inSync = Boolean(existing) && existingGames === priorSeasonGames;
  const preservedWinStreak = existing?.winStreak ?? 0;
  const preservedLossStreak = existing?.lossStreak ?? 0;

  if (inSync && existing) {
    return incrementExisting(existing, result, countTowardStreak);
  }

  // Desynced: board missing, behind, or inflated vs profile games played.
  if (existing && existingGames > 0 && existingGames < priorSeasonGames) {
    // Known season row is behind profile — advance it by this match only.
    // Do not fill the gap as all wins or all losses.
    return incrementExisting(existing, result, countTowardStreak);
  }

  // Missing row, empty row, career leak (board ahead of season), or other
  // desync — start from this match. Login restore reseeds from remote later.
  return singleMatchStats(
    result,
    countTowardStreak,
    preservedWinStreak,
    preservedLossStreak,
  );
};
