import { readJson, writeJson } from "./browserStorage";
import {
  persistClassicLeaderboardOutcome,
  persistRankedOutcome,
  type PersistedBannersOutcome,
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

export type RankedMatchOutcome = PersistedBannersOutcome;
export type ClassicMatchOutcome = PersistedBannersOutcome;

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
): {
  record: PlayerRecord;
  ranked?: RankedMatchOutcome;
  classic?: ClassicMatchOutcome;
} => {
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
  const opponentElo = options.opponentElo ?? RANKED_STARTING_ELO;

  if (mode === "headToHead") {
    classic = persistClassicLeaderboardOutcome(
      result,
      team,
      record,
      opponentElo,
    );
  }

  if (mode === "ranked") {
    ranked = persistRankedOutcome(result, team, record, opponentElo);
  }

  writeJson(LAST_RECORDED_MATCH_KEY, { matchId });
  writeJson(LAST_MATCH_OUTCOME_KEY, { matchId, ranked, classic });

  return { record, ranked, classic };
};
