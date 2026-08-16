import { ensureCurrentClassicSeason } from "./classicProfile";
import { loadLeaderboardEntries } from "./leaderboard";
import { getOrCreatePlayerId } from "./playerIdentity";
import type { HeadToHeadResult, PlayerRecord } from "./playerRecord";
import { loadRankedLeaderboardEntries } from "./rankedLeaderboard";
import { ensureCurrentRankedSeason } from "./rankedProfile";
import { nextSeasonLeaderboardStats } from "./seasonLeaderboardStats";

/** Season-board W–L + streaks shown on Play cards, draft, results, and Ranks. */
export type SeasonBoardRecord = Pick<
  PlayerRecord,
  "wins" | "losses" | "ties" | "winStreak" | "lossStreak"
>;

export type SeasonBoardMode = "classic" | "ranked";

export const emptySeasonBoardRecord = (): SeasonBoardRecord => ({
  wins: 0,
  losses: 0,
  ties: 0,
  winStreak: 0,
  lossStreak: 0,
});

export const loadSelfSeasonBoardRecord = (
  mode: SeasonBoardMode,
): SeasonBoardRecord => {
  const playerId = getOrCreatePlayerId();
  const entry =
    mode === "classic"
      ? loadLeaderboardEntries().find((candidate) => candidate.playerId === playerId)
      : loadRankedLeaderboardEntries().find(
          (candidate) => candidate.playerId === playerId,
        );

  if (!entry) {
    return emptySeasonBoardRecord();
  }

  return {
    wins: entry.wins,
    losses: entry.losses,
    ties: 0,
    winStreak: entry.winStreak,
    lossStreak: entry.lossStreak,
  };
};

/** Project season board after this match (before persist) — same math as persistence. */
export const projectSelfSeasonBoardRecordAfterMatch = (
  mode: SeasonBoardMode,
  result: HeadToHeadResult,
  options: { countTowardStreak?: boolean } = {},
): SeasonBoardRecord => {
  const playerId = getOrCreatePlayerId();
  const existingEntry =
    mode === "classic"
      ? loadLeaderboardEntries().find((candidate) => candidate.playerId === playerId)
      : loadRankedLeaderboardEntries().find(
          (candidate) => candidate.playerId === playerId,
        );
  const priorSeasonGames =
    mode === "classic"
      ? ensureCurrentClassicSeason().classicGamesPlayed
      : ensureCurrentRankedSeason().rankedGamesPlayed;

  const stats = nextSeasonLeaderboardStats({
    existing: existingEntry
      ? {
          wins: existingEntry.wins,
          losses: existingEntry.losses,
          winStreak: existingEntry.winStreak,
          lossStreak: existingEntry.lossStreak,
        }
      : null,
    result,
    priorSeasonGames,
    countTowardStreak: options.countTowardStreak,
  });

  return {
    wins: stats.wins,
    losses: stats.losses,
    ties: 0,
    winStreak: stats.winStreak,
    lossStreak: stats.lossStreak,
  };
};
