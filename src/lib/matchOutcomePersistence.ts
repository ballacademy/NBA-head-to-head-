import {
  upsertLeaderboardEntry,
  loadLeaderboardEntries,
} from "./leaderboard";
import {
  upsertRankedLeaderboardEntry,
  loadRankedLeaderboardEntries,
} from "./rankedLeaderboard";
import { applyAllTimeMatchResult } from "./allTimeProfile";
import { applyClassicMatchResult, ensureCurrentClassicSeason } from "./classicProfile";
import { applyRankedMatchResult, ensureCurrentRankedSeason } from "./rankedProfile";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import {
  type HeadToHeadResult,
  type PlayerRecord,
} from "./playerRecord";
import { nextSeasonLeaderboardStats } from "./seasonLeaderboardStats";
import type { TeamProfile } from "./teamProfile";

export interface PersistedBannersOutcome {
  delta: number;
  elo: number;
  tierLabel: string;
  opponentElo: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  /**
   * 1-based Elo leaderboard rank after remote confirm.
   * Persist leaves this null; results UI fills it after API sync.
   */
  leaderboardRank: number | null;
}

/** @deprecated Prefer PersistedBannersOutcome */
export type PersistedRankedOutcome = PersistedBannersOutcome;

export const persistClassicLeaderboardOutcome = (
  result: HeadToHeadResult,
  team: TeamProfile,
  record: PlayerRecord,
  opponentElo: number,
  options: { countTowardStreak?: boolean } = {},
): PersistedBannersOutcome => {
  const countTowardStreak = options.countTowardStreak !== false;
  const before = ensureCurrentClassicSeason();
  const existing = loadLeaderboardEntries().find(
    (entry) => entry.playerId === record.playerId,
  );
  // Stored-lineup owner results still move Banners, but do not use or change streaks.
  const classicResult = applyClassicMatchResult({
    result,
    opponentElo,
    winStreak: countTowardStreak ? record.winStreak : 0,
    lossStreak: countTowardStreak ? record.lossStreak : 0,
  });
  const seasonStats = nextSeasonLeaderboardStats({
    existing,
    result,
    priorSeasonGames: before.classicGamesPlayed,
    countTowardStreak,
  });
  const { publicTag } = getOrCreatePlayerIdentity();

  const leaderboardRank = upsertLeaderboardEntry({
    playerId: record.playerId,
    name: team.name,
    publicTag,
    elo: classicResult.profile.elo,
    wins: seasonStats.wins,
    losses: seasonStats.losses,
    ties: seasonStats.ties,
    winStreak: seasonStats.winStreak,
    lossStreak: seasonStats.lossStreak,
  });
  void leaderboardRank;

  return {
    delta: classicResult.delta,
    elo: classicResult.profile.elo,
    tierLabel: classicResult.profile.tier.label,
    opponentElo: classicResult.opponentElo,
    wins: seasonStats.wins,
    losses: seasonStats.losses,
    winStreak: seasonStats.winStreak,
    lossStreak: seasonStats.lossStreak,
    leaderboardRank: null,
  };
};

export const persistRankedOutcome = (
  result: HeadToHeadResult,
  team: TeamProfile,
  record: PlayerRecord,
  opponentElo: number,
  options: { countTowardStreak?: boolean } = {},
): PersistedBannersOutcome => {
  const countTowardStreak = options.countTowardStreak !== false;
  const before = ensureCurrentRankedSeason();
  const existing = loadRankedLeaderboardEntries().find(
    (entry) => entry.playerId === record.playerId,
  );
  const rankedResult = applyRankedMatchResult({
    result,
    opponentElo,
    winStreak: countTowardStreak ? record.winStreak : 0,
    lossStreak: countTowardStreak ? record.lossStreak : 0,
  });
  const seasonStats = nextSeasonLeaderboardStats({
    existing,
    result,
    priorSeasonGames: before.rankedGamesPlayed,
    countTowardStreak,
  });

  const leaderboardRank = upsertRankedLeaderboardEntry({
    playerId: record.playerId,
    name: team.name,
    publicTag: getOrCreatePlayerIdentity().publicTag,
    elo: rankedResult.profile.elo,
    wins: seasonStats.wins,
    losses: seasonStats.losses,
    ties: seasonStats.ties,
    winStreak: seasonStats.winStreak,
    lossStreak: seasonStats.lossStreak,
    isNpc: false,
  });
  void leaderboardRank;

  return {
    delta: rankedResult.delta,
    elo: rankedResult.profile.elo,
    tierLabel: rankedResult.profile.tier.label,
    opponentElo: rankedResult.opponentElo,
    wins: seasonStats.wins,
    losses: seasonStats.losses,
    winStreak: seasonStats.winStreak,
    lossStreak: seasonStats.lossStreak,
    leaderboardRank: null,
  };
};

/** All-Time career banners (local only — no monthly board). */
export const persistAllTimeOutcome = (
  result: HeadToHeadResult,
  record: PlayerRecord,
  opponentElo: number,
  options: { countTowardStreak?: boolean } = {},
): PersistedBannersOutcome => {
  const countTowardStreak = options.countTowardStreak !== false;
  const allTimeResult = applyAllTimeMatchResult({
    result,
    opponentElo,
    winStreak: countTowardStreak ? record.winStreak : 0,
    lossStreak: countTowardStreak ? record.lossStreak : 0,
  });

  return {
    delta: allTimeResult.delta,
    elo: allTimeResult.profile.elo,
    tierLabel: allTimeResult.profile.tier.label,
    opponentElo: allTimeResult.opponentElo,
    wins: record.wins,
    losses: record.losses,
    winStreak: record.winStreak,
    lossStreak: record.lossStreak,
    leaderboardRank: null,
  };
};
