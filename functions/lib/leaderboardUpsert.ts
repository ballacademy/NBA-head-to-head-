/** Shared first-insert / update checks for /api/leaderboards POST. */

export const MAX_ELO_DELTA_PER_UPSERT = 128;
export const MAX_RECORD_DELTA_PER_UPSERT = 1;
export const MAX_ELO = 4000;

export type LeaderboardUpsertMode = "classic" | "ranked" | "event";

export const startingEloForMode = (mode: LeaderboardUpsertMode) =>
  mode === "event" ? 1000 : 500;

export interface LeaderboardUpsertStats {
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
}

export interface ExistingLeaderboardRow {
  elo: number;
  wins: number;
  losses: number;
  win_streak: number;
  loss_streak: number;
}

export const validateLeaderboardUpsert = (
  mode: LeaderboardUpsertMode,
  next: LeaderboardUpsertStats,
  existing: ExistingLeaderboardRow | null,
): string | null => {
  const { elo, wins, losses, winStreak, lossStreak } = next;
  const STARTING_ELO = startingEloForMode(mode);

  if (!Number.isFinite(elo)) {
    return "elo must be a number";
  }

  if (elo > MAX_ELO) {
    return "elo exceeds the maximum allowed value";
  }

  if (!existing) {
    const games = wins + losses;
    if (winStreak > wins || lossStreak > losses) {
      return "streaks cannot exceed wins or losses";
    }

    if (games === 0) {
      if (elo !== STARTING_ELO || winStreak !== 0 || lossStreak !== 0) {
        return "new leaderboard entries must start at the season default rating with a 0-0 record";
      }
      return null;
    }

    const maxBootstrapDelta = games * MAX_ELO_DELTA_PER_UPSERT;
    if (Math.abs(elo - STARTING_ELO) > maxBootstrapDelta) {
      return "elo change exceeds the maximum allowed per update";
    }

    if (games === 1) {
      if (wins === 1 && losses === 0) {
        // Live match: streak becomes 1. Stored-lineup owner results may
        // update W–L without touching streaks (both remain 0).
        const liveWin = winStreak === 1 && lossStreak === 0;
        const streakFrozen = winStreak === 0 && lossStreak === 0;
        if (!liveWin && !streakFrozen) {
          return "win streak update is invalid";
        }
      } else if (wins === 0 && losses === 1) {
        const liveLoss = lossStreak === 1 && winStreak === 0;
        const streakFrozen = winStreak === 0 && lossStreak === 0;
        if (!liveLoss && !streakFrozen) {
          return "loss streak update is invalid";
        }
      } else {
        return "record update must be exactly one win or loss";
      }
      return null;
    }

    if (winStreak === 0 && lossStreak === 0) {
      return "streaks cannot both be zero after matches";
    }

    return null;
  }

  const eloDelta = Math.abs(elo - existing.elo);
  const winsDelta = wins - existing.wins;
  const lossesDelta = losses - existing.losses;
  const gamesDelta = winsDelta + lossesDelta;

  if (eloDelta > MAX_ELO_DELTA_PER_UPSERT) {
    return "elo change exceeds the maximum allowed per update";
  }

  if (winsDelta < 0 || lossesDelta < 0) {
    return "wins and losses cannot decrease";
  }

  if (gamesDelta > MAX_RECORD_DELTA_PER_UPSERT) {
    return "record change exceeds one match per update";
  }

  if (gamesDelta === 0) {
    // Ties update Elo without changing wins/losses. Allow Elo movement within
    // the normal per-match bound when streaks are unchanged.
    if (
      winStreak !== existing.win_streak ||
      lossStreak !== existing.loss_streak
    ) {
      return "streaks cannot change without a recorded win or loss";
    }

    if (elo === existing.elo) {
      return null;
    }

    if (eloDelta > MAX_ELO_DELTA_PER_UPSERT) {
      return "elo change exceeds the maximum allowed per update";
    }

    return null;
  } else if (winsDelta === 1 && lossesDelta === 0) {
    // Live: win streak increments and loss streak clears.
    // Owner stored-lineup results: W–L moves, streaks stay frozen.
    const liveWin =
      lossStreak === 0 && winStreak === existing.win_streak + 1;
    const streakFrozen =
      winStreak === existing.win_streak &&
      lossStreak === existing.loss_streak;
    if (!liveWin && !streakFrozen) {
      return "win streak update is invalid";
    }
  } else if (lossesDelta === 1 && winsDelta === 0) {
    const liveLoss =
      winStreak === 0 && lossStreak === existing.loss_streak + 1;
    const streakFrozen =
      winStreak === existing.win_streak &&
      lossStreak === existing.loss_streak;
    if (!liveLoss && !streakFrozen) {
      return "loss streak update is invalid";
    }
  } else {
    return "record update must be exactly one win or loss";
  }

  if (winStreak > wins || lossStreak > losses) {
    return "streaks cannot exceed wins or losses";
  }

  return null;
};
