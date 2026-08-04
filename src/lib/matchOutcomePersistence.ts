import {
  upsertLeaderboardEntry,
  loadLeaderboardEntries,
} from "./leaderboard";
import {
  upsertRankedLeaderboardEntry,
  loadRankedLeaderboardEntries,
} from "./rankedLeaderboard";
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
}

/** @deprecated Prefer PersistedBannersOutcome */
export type PersistedRankedOutcome = PersistedBannersOutcome;

export const persistClassicLeaderboardOutcome = (
  result: HeadToHeadResult,
  team: TeamProfile,
  record: PlayerRecord,
  opponentElo: number,
): PersistedBannersOutcome => {
  const before = ensureCurrentClassicSeason();
  const existing = loadLeaderboardEntries().find(
    (entry) => entry.playerId === record.playerId,
  );
  const classicResult = applyClassicMatchResult({
    result,
    opponentElo,
    winStreak: record.winStreak,
    lossStreak: record.lossStreak,
  });
  const seasonStats = nextSeasonLeaderboardStats({
    existing,
    result,
    priorSeasonGames: before.classicGamesPlayed,
  });
  const { publicTag } = getOrCreatePlayerIdentity();

  upsertLeaderboardEntry({
    playerId: record.playerId,
    name: team.name,
    publicTag,
    elo: classicResult.profile.elo,
    wins: seasonStats.wins,
    losses: seasonStats.losses,
    winStreak: seasonStats.winStreak,
    lossStreak: seasonStats.lossStreak,
  });

  return {
    delta: classicResult.delta,
    elo: classicResult.profile.elo,
    tierLabel: classicResult.profile.tier.label,
    opponentElo: classicResult.opponentElo,
  };
};

export const persistRankedOutcome = (
  result: HeadToHeadResult,
  team: TeamProfile,
  record: PlayerRecord,
  opponentElo: number,
): PersistedBannersOutcome => {
  const before = ensureCurrentRankedSeason();
  const existing = loadRankedLeaderboardEntries().find(
    (entry) => entry.playerId === record.playerId,
  );
  const rankedResult = applyRankedMatchResult({
    result,
    opponentElo,
    winStreak: record.winStreak,
    lossStreak: record.lossStreak,
  });
  const seasonStats = nextSeasonLeaderboardStats({
    existing,
    result,
    priorSeasonGames: before.rankedGamesPlayed,
  });

  upsertRankedLeaderboardEntry({
    playerId: record.playerId,
    name: team.name,
    publicTag: getOrCreatePlayerIdentity().publicTag,
    elo: rankedResult.profile.elo,
    wins: seasonStats.wins,
    losses: seasonStats.losses,
    winStreak: seasonStats.winStreak,
    lossStreak: seasonStats.lossStreak,
    isNpc: false,
  });

  return {
    delta: rankedResult.delta,
    elo: rankedResult.profile.elo,
    tierLabel: rankedResult.profile.tier.label,
    opponentElo: rankedResult.opponentElo,
  };
};
