import type { HeadToHeadResult } from "./playerRecord";

export interface SeasonLeaderboardStats {
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
}

export interface SeasonLeaderboardBase {
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
}

/**
 * Build monthly/event-board W–L from the prior season row + this match.
 * Career modeRecords must not be posted to season leaderboards — the API
 * rejects first inserts with more than one game when no D1 row exists yet.
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
  const existingGames = existing ? existing.wins + existing.losses : 0;
  const inSync = Boolean(existing) && existingGames === priorSeasonGames;
  const preservedWinStreak = existing?.winStreak ?? 0;
  const preservedLossStreak = existing?.lossStreak ?? 0;

  if (result === "tie") {
    if (inSync && existing) {
      return {
        wins: existing.wins,
        losses: existing.losses,
        winStreak: existing.winStreak,
        lossStreak: existing.lossStreak,
      };
    }

    return { wins: 0, losses: 0, winStreak: 0, lossStreak: 0 };
  }

  // Prefer the prior season row when it matches profile games played.
  // If desynced (career stats leaked into the season board, or missing row
  // after a failed remote sync), re-base so this match is game #1 on the board
  // when priorSeasonGames is 0; otherwise synthesize a consistent totals row
  // that matches the season game count so first-insert catch-up can succeed.
  if (!inSync) {
    if (priorSeasonGames <= 0) {
      if (!countTowardStreak) {
        return result === "win"
          ? { wins: 1, losses: 0, winStreak: 0, lossStreak: 0 }
          : { wins: 0, losses: 1, winStreak: 0, lossStreak: 0 };
      }

      return result === "win"
        ? { wins: 1, losses: 0, winStreak: 1, lossStreak: 0 }
        : { wins: 0, losses: 1, winStreak: 0, lossStreak: 1 };
    }

    const gamesAfter = priorSeasonGames + 1;
    if (!countTowardStreak) {
      return result === "win"
        ? {
            wins: gamesAfter,
            losses: 0,
            winStreak: preservedWinStreak,
            lossStreak: preservedLossStreak,
          }
        : {
            wins: 0,
            losses: gamesAfter,
            winStreak: preservedWinStreak,
            lossStreak: preservedLossStreak,
          };
    }

    return result === "win"
      ? {
          wins: gamesAfter,
          losses: 0,
          winStreak: gamesAfter,
          lossStreak: 0,
        }
      : {
          wins: 0,
          losses: gamesAfter,
          winStreak: 0,
          lossStreak: gamesAfter,
        };
  }

  if (result === "win") {
    return {
      wins: existing!.wins + 1,
      losses: existing!.losses,
      winStreak: countTowardStreak ? existing!.winStreak + 1 : existing!.winStreak,
      lossStreak: countTowardStreak ? 0 : existing!.lossStreak,
    };
  }

  return {
    wins: existing!.wins,
    losses: existing!.losses + 1,
    winStreak: countTowardStreak ? 0 : existing!.winStreak,
    lossStreak: countTowardStreak
      ? existing!.lossStreak + 1
      : existing!.lossStreak,
  };
};
