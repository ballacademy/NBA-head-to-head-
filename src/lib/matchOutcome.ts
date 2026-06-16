import { readJson, writeJson } from "./browserStorage";
import { upsertLeaderboardEntry } from "./leaderboard";
import {
  buildLeaderboardIdentity,
  loadPlayerRecord,
  recordMatchResult,
  type PlayerRecord,
} from "./playerRecord";
import type { TeamProfile } from "./teamProfile";

const LAST_RECORDED_MATCH_KEY = "nba-head-to-head-last-recorded-match";

export const projectRecordAfterMatch = (
  userWon: boolean,
  current = loadPlayerRecord(),
): PlayerRecord => ({
  ...current,
  wins: current.wins + (userWon ? 1 : 0),
  losses: current.losses + (userWon ? 0 : 1),
  winStreak: userWon ? current.winStreak + 1 : 0,
});

export const persistMatchOutcome = (
  userWon: boolean,
  team: TeamProfile,
  matchId: string,
) => {
  const lastRecorded = readJson<{ matchId: string }>(LAST_RECORDED_MATCH_KEY);

  if (lastRecorded?.matchId === matchId) {
    return loadPlayerRecord();
  }

  const record = recordMatchResult(userWon);
  upsertLeaderboardEntry(buildLeaderboardIdentity(team, record));
  writeJson(LAST_RECORDED_MATCH_KEY, { matchId });

  return record;
};
