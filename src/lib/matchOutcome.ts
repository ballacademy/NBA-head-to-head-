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
const RECORDED_MATCH_IDS_KEY = "nba-head-to-head-recorded-match-ids";
const MAX_RECORDED_MATCH_IDS = 80;

interface CachedMatchOutcome {
  matchId: string;
  ranked?: RankedMatchOutcome;
  classic?: ClassicMatchOutcome;
}

const loadRecordedMatchIds = (): string[] => {
  const saved = readJson<string[]>(RECORDED_MATCH_IDS_KEY);
  return Array.isArray(saved)
    ? saved.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
};

const rememberRecordedMatchId = (matchId: string) => {
  const next = [
    matchId,
    ...loadRecordedMatchIds().filter((id) => id !== matchId),
  ].slice(0, MAX_RECORDED_MATCH_IDS);
  writeJson(RECORDED_MATCH_IDS_KEY, next);
  writeJson(LAST_RECORDED_MATCH_KEY, { matchId });
};

export const hasRecordedMatchId = (matchId: string) => {
  if (loadRecordedMatchIds().includes(matchId)) {
    return true;
  }

  const lastRecorded = readJson<{ matchId: string }>(LAST_RECORDED_MATCH_KEY);
  return lastRecorded?.matchId === matchId;
};

export const projectRecordAfterMatch = (
  result: HeadToHeadResult,
  mode: MatchRecordMode = "headToHead",
  current = loadPlayerRecord(mode),
  options: { countTowardStreak?: boolean } = {},
): PlayerRecord => ({
  ...current,
  ...applyHeadToHeadResultToStats(current, result, options),
});

export const persistMatchOutcome = (
  result: HeadToHeadResult,
  team: TeamProfile,
  matchId: string,
  mode: MatchRecordMode = "headToHead",
  options: { opponentElo?: number; countTowardStreak?: boolean } = {},
): {
  record: PlayerRecord;
  ranked?: RankedMatchOutcome;
  classic?: ClassicMatchOutcome;
} => {
  if (hasRecordedMatchId(matchId)) {
    const cached = readJson<CachedMatchOutcome>(LAST_MATCH_OUTCOME_KEY);

    return {
      record: loadPlayerRecord(mode),
      ranked: cached?.matchId === matchId ? cached.ranked : undefined,
      classic: cached?.matchId === matchId ? cached.classic : undefined,
    };
  }

  const countTowardStreak = options.countTowardStreak !== false;
  const record = recordMatchResult(result, mode, { countTowardStreak });
  let ranked: RankedMatchOutcome | undefined;
  let classic: ClassicMatchOutcome | undefined;
  const opponentElo = options.opponentElo ?? RANKED_STARTING_ELO;

  if (mode === "headToHead") {
    classic = persistClassicLeaderboardOutcome(
      result,
      team,
      record,
      opponentElo,
      { countTowardStreak },
    );
  }

  if (mode === "ranked") {
    ranked = persistRankedOutcome(result, team, record, opponentElo, {
      countTowardStreak,
    });
  }

  rememberRecordedMatchId(matchId);
  writeJson(LAST_MATCH_OUTCOME_KEY, { matchId, ranked, classic });

  return { record, ranked, classic };
};
