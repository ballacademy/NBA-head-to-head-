import {
  upsertLeaderboardEntry,
} from "./leaderboard";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import { applyClassicMatchResult } from "./classicProfile";
import { applyRankedMatchResult } from "./rankedProfile";
import { RANKED_STARTING_ELO } from "./rankedElo";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import {
  buildLeaderboardIdentity,
  type HeadToHeadResult,
  type PlayerRecord,
} from "./playerRecord";
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
  const classicResult = applyClassicMatchResult({
    result,
    opponentElo,
    winStreak: record.winStreak,
    lossStreak: record.lossStreak,
  });

  upsertLeaderboardEntry({
    ...buildLeaderboardIdentity(team, record),
    elo: classicResult.profile.elo,
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
  const rankedResult = applyRankedMatchResult({
    result,
    opponentElo,
    winStreak: record.winStreak,
    lossStreak: record.lossStreak,
  });

  upsertRankedLeaderboardEntry({
    playerId: record.playerId,
    name: team.name,
    publicTag: getOrCreatePlayerIdentity().publicTag,
    elo: rankedResult.profile.elo,
    wins: record.wins,
    losses: record.losses,
    winStreak: record.winStreak,
    lossStreak: record.lossStreak,
    isNpc: false,
  });

  return {
    delta: rankedResult.delta,
    elo: rankedResult.profile.elo,
    tierLabel: rankedResult.profile.tier.label,
    opponentElo: rankedResult.opponentElo,
  };
};
