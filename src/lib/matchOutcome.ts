import { readJson, writeJson } from "./browserStorage";
import { upsertLeaderboardEntry } from "./leaderboard";
import {
  buildLeaderboardIdentity,
  loadPlayerRecord,
  recordMatchResult,
  type MatchRecordMode,
  type PlayerRecord,
} from "./playerRecord";
import type { TeamProfile } from "./teamProfile";

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
) => {
  const lastRecorded = readJson<{ matchId: string }>(LAST_RECORDED_MATCH_KEY);

  if (lastRecorded?.matchId === matchId) {
    return loadPlayerRecord(mode);
  }

  const record = recordMatchResult(userWon, mode);

  if (mode === "headToHead") {
    upsertLeaderboardEntry(buildLeaderboardIdentity(team, record));
  }

  writeJson(LAST_RECORDED_MATCH_KEY, { matchId });

  return record;
};
