import { readJson, writeJson } from "./browserStorage";
import { applyClassicMatchResult } from "./classicProfile";
import { upsertLeaderboardEntry } from "./leaderboard";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import { applyRankedMatchResult } from "./rankedProfile";
import { RANKED_STARTING_ELO } from "./rankedElo";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import {
  applyHeadToHeadResultToStats,
  buildLeaderboardIdentity,
  loadPlayerRecord,
  recordMatchResult,
  type HeadToHeadResult,
  type MatchRecordMode,
  type PlayerRecord,
} from "./playerRecord";
import type { TeamProfile } from "./teamProfile";

export interface RankedMatchOutcome {
  delta: number;
  elo: number;
  tierLabel: string;
  opponentElo: number;
}

export interface ClassicMatchOutcome {
  delta: number;
  elo: number;
  tierLabel: string;
  opponentElo: number;
}

const LAST_RECORDED_MATCH_KEY = "nba-head-to-head-last-recorded-match";
const LAST_MATCH_OUTCOME_KEY = "nba-head-to-head-last-match-outcome";

interface CachedMatchOutcome {
  matchId: string;
  ranked?: RankedMatchOutcome;
  classic?: ClassicMatchOutcome;
}

export const projectRecordAfterMatch = (
  result: HeadToHeadResult,
  mode: MatchRecordMode = "headToHead",
  current = loadPlayerRecord(mode),
): PlayerRecord => ({
  ...current,
  ...applyHeadToHeadResultToStats(current, result),
});

export const persistMatchOutcome = (
  result: HeadToHeadResult,
  team: TeamProfile,
  matchId: string,
  mode: MatchRecordMode = "headToHead",
  options: { opponentElo?: number } = {},
): { record: PlayerRecord; ranked?: RankedMatchOutcome; classic?: ClassicMatchOutcome } => {
  const lastRecorded = readJson<{ matchId: string }>(LAST_RECORDED_MATCH_KEY);

  if (lastRecorded?.matchId === matchId) {
    const cached = readJson<CachedMatchOutcome>(LAST_MATCH_OUTCOME_KEY);

    return {
      record: loadPlayerRecord(mode),
      ranked: cached?.matchId === matchId ? cached.ranked : undefined,
      classic: cached?.matchId === matchId ? cached.classic : undefined,
    };
  }

  const record = recordMatchResult(result, mode);
  let ranked: RankedMatchOutcome | undefined;
  let classic: ClassicMatchOutcome | undefined;

  if (mode === "headToHead") {
    const opponentElo = options.opponentElo ?? RANKED_STARTING_ELO;
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

    classic = {
      delta: classicResult.delta,
      elo: classicResult.profile.elo,
      tierLabel: classicResult.profile.tier.label,
      opponentElo: classicResult.opponentElo,
    };
  }

  if (mode === "ranked") {
    const opponentElo = options.opponentElo ?? RANKED_STARTING_ELO;
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

    ranked = {
      delta: rankedResult.delta,
      elo: rankedResult.profile.elo,
      tierLabel: rankedResult.profile.tier.label,
      opponentElo: rankedResult.opponentElo,
    };
  }

  writeJson(LAST_RECORDED_MATCH_KEY, { matchId });
  writeJson(LAST_MATCH_OUTCOME_KEY, { matchId, ranked, classic });

  return { record, ranked, classic };
};
