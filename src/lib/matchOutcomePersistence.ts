import {
  upsertLeaderboardEntry,
} from "./leaderboard";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import { applyRankedMatchResult } from "./rankedProfile";
import { RANKED_STARTING_ELO } from "./rankedElo";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import {
  buildLeaderboardIdentity,
  type HeadToHeadResult,
  type PlayerRecord,
} from "./playerRecord";
import type { TeamProfile } from "./teamProfile";

export interface PersistedRankedOutcome {
  delta: number;
  elo: number;
  tierLabel: string;
  opponentElo: number;
}

export const persistClassicLeaderboardOutcome = (
  result: HeadToHeadResult,
  team: TeamProfile,
  record: PlayerRecord,
) => {
  void result;

  upsertLeaderboardEntry({
    ...buildLeaderboardIdentity(team, record),
    elo: RANKED_STARTING_ELO,
  });
};

export const persistRankedOutcome = (
  result: HeadToHeadResult,
  team: TeamProfile,
  record: PlayerRecord,
  opponentElo: number,
): PersistedRankedOutcome => {
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
