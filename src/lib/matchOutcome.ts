import { readJson, writeJson } from "./browserStorage";
import {
  persistClassicLeaderboardOutcome,
  persistRankedOutcome,
  type PersistedRankedOutcome,
} from "./matchOutcomePersistence";
import {
  applyHeadToHeadResultToStats,
  loadPlayerRecord,
  recordMatchResult,
  type HeadToHeadResult,
  type MatchRecordMode,
  type PlayerRecord,
} from "./playerRecord";
import { RANKED_STARTING_ELO } from "./rankedElo";
import type { TeamProfile } from "./teamProfile";

export type RankedMatchOutcome = PersistedRankedOutcome;

const LAST_RECORDED_MATCH_KEY = "nba-head-to-head-last-recorded-match";
const LAST_MATCH_OUTCOME_KEY = "nba-head-to-head-last-match-outcome";

interface CachedMatchOutcome {
  matchId: string;
  ranked?: RankedMatchOutcome;
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
): { record: PlayerRecord; ranked?: RankedMatchOutcome } => {
  const lastRecorded = readJson<{ matchId: string }>(LAST_RECORDED_MATCH_KEY);

  if (lastRecorded?.matchId === matchId) {
    const cached = readJson<CachedMatchOutcome>(LAST_MATCH_OUTCOME_KEY);

    return {
      record: loadPlayerRecord(mode),
      ranked: cached?.matchId === matchId ? cached.ranked : undefined,
    };
  }

  const record = recordMatchResult(result, mode);
  let ranked: RankedMatchOutcome | undefined;

  if (mode === "headToHead") {
    persistClassicLeaderboardOutcome(result, team, record);
  }

  if (mode === "ranked") {
    ranked = persistRankedOutcome(
      result,
      team,
      record,
      options.opponentElo ?? RANKED_STARTING_ELO,
    );
  }

  writeJson(LAST_RECORDED_MATCH_KEY, { matchId });
  writeJson(LAST_MATCH_OUTCOME_KEY, { matchId, ranked });

  return { record, ranked };
};
