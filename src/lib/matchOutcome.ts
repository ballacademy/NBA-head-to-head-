import { readJson, writeJson } from "./browserStorage";
import { upsertLeaderboardEntry } from "./leaderboard";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import { applyRankedMatchResult } from "./rankedProfile";
import {
  buildLeaderboardIdentity,
  loadPlayerRecord,
  recordMatchResult,
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

const LAST_RECORDED_MATCH_KEY = "nba-head-to-head-last-recorded-match";

export const projectRecordAfterMatch = (
  userWon: boolean,
  mode: MatchRecordMode = "headToHead",
  current = loadPlayerRecord(mode),
): PlayerRecord => ({
  ...current,
  wins: current.wins + (userWon ? 1 : 0),
  losses: current.losses + (userWon ? 0 : 1),
  winStreak: userWon ? current.winStreak + 1 : 0,
  lossStreak: userWon ? 0 : current.lossStreak + 1,
});

export const persistMatchOutcome = (
  userWon: boolean,
  team: TeamProfile,
  matchId: string,
  mode: MatchRecordMode = "headToHead",
  options: { opponentElo?: number } = {},
): { record: PlayerRecord; ranked?: RankedMatchOutcome } => {
  const lastRecorded = readJson<{ matchId: string }>(LAST_RECORDED_MATCH_KEY);

  if (lastRecorded?.matchId === matchId) {
    return { record: loadPlayerRecord(mode) };
  }

  const record = recordMatchResult(userWon, mode);
  let ranked: RankedMatchOutcome | undefined;

  if (mode === "headToHead") {
    upsertLeaderboardEntry(buildLeaderboardIdentity(team, record));
  }

  if (mode === "ranked") {
    const opponentElo = options.opponentElo ?? 500;
    const rankedResult = applyRankedMatchResult({
      won: userWon,
      opponentElo,
      winStreak: record.winStreak,
      lossStreak: record.lossStreak,
    });

    upsertRankedLeaderboardEntry({
      playerId: record.playerId,
      name: team.name,
      elo: rankedResult.profile.elo,
      wins: record.wins,
      losses: record.losses,
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

  return { record, ranked };
};
