import { readJson, writeJson } from "./browserStorage";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import type { TeamProfile } from "./teamProfile";

const PLAYER_RECORDS_KEY = "nba-head-to-head-player-records-by-mode";
const LEGACY_PLAYER_RECORD_KEY = "nba-head-to-head-player-record";

export const MIN_GAMES_FOR_WIN_PCT = 20;

export type MatchRecordMode = "headToHead" | "ranked" | "allTime";

export const MATCH_RECORD_MODES: MatchRecordMode[] = [
  "headToHead",
  "ranked",
  "allTime",
];

export type HeadToHeadResult = "win" | "loss" | "tie";

export interface PlayerRecord {
  playerId: string;
  wins: number;
  losses: number;
  ties: number;
  winStreak: number;
  lossStreak: number;
}

export interface ModePlayerRecords {
  headToHead: PlayerRecord;
  ranked: PlayerRecord;
  allTime: PlayerRecord;
}

type ModeRecordStats = Omit<PlayerRecord, "playerId">;

interface StoredModeRecords {
  headToHead?: Partial<ModeRecordStats>;
  ranked?: Partial<ModeRecordStats>;
  allTime?: Partial<ModeRecordStats>;
}

const emptyModeStats = (): ModeRecordStats => ({
  wins: 0,
  losses: 0,
  ties: 0,
  winStreak: 0,
  lossStreak: 0,
});

const normalizeModeStats = (saved?: Partial<ModeRecordStats>): ModeRecordStats => ({
  wins: saved?.wins ?? 0,
  losses: saved?.losses ?? 0,
  ties: saved?.ties ?? 0,
  winStreak: saved?.winStreak ?? 0,
  lossStreak: saved?.lossStreak ?? 0,
});

export const applyHeadToHeadResultToStats = (
  current: ModeRecordStats,
  result: HeadToHeadResult,
): ModeRecordStats => ({
  wins: current.wins + (result === "win" ? 1 : 0),
  losses: current.losses + (result === "loss" ? 1 : 0),
  ties: current.ties + (result === "tie" ? 1 : 0),
  winStreak:
    result === "win"
      ? current.winStreak + 1
      : result === "loss"
        ? 0
        : current.winStreak,
  lossStreak:
    result === "loss"
      ? current.lossStreak + 1
      : result === "win"
        ? 0
        : current.lossStreak,
});

export { getOrCreatePlayerId } from "./playerIdentity";

const loadStoredModeRecords = (): StoredModeRecords => {
  const saved = readJson<StoredModeRecords>(PLAYER_RECORDS_KEY);

  if (saved) {
    return saved;
  }

  const legacy = readJson<Partial<PlayerRecord>>(LEGACY_PLAYER_RECORD_KEY);

  if (legacy) {
    return {
      headToHead: {
        wins: legacy.wins,
        losses: legacy.losses,
        winStreak: legacy.winStreak,
        lossStreak: legacy.lossStreak,
      },
    };
  }

  return {};
};

const saveModeStats = (mode: MatchRecordMode, stats: ModeRecordStats) => {
  const saved = loadStoredModeRecords();
  writeJson(PLAYER_RECORDS_KEY, {
    ...saved,
    [mode]: stats,
  });
};

export const getMatchRecordMode = (options: {
  allTimeMode?: boolean;
  salaryCapMode?: boolean;
}): MatchRecordMode => {
  if (options.allTimeMode) {
    return "allTime";
  }

  if (options.salaryCapMode) {
    return "ranked";
  }

  return "headToHead";
};

export const loadPlayerRecord = (
  mode: MatchRecordMode = "headToHead",
): PlayerRecord => {
  const playerId = getOrCreatePlayerIdentity().playerId;
  const saved = loadStoredModeRecords();
  const stats = normalizeModeStats(saved[mode]);

  return {
    playerId,
    ...stats,
  };
};

export const loadAllModeRecords = (): ModePlayerRecords => ({
  headToHead: loadPlayerRecord("headToHead"),
  ranked: loadPlayerRecord("ranked"),
  allTime: loadPlayerRecord("allTime"),
});

export const formatPlayerRecord = (
  record: Pick<PlayerRecord, "wins" | "losses"> & { ties?: number },
) => {
  const ties = record.ties ?? 0;

  return ties > 0
    ? `${record.wins}-${record.losses}-${ties}`
    : `${record.wins}-${record.losses}`;
};

export const getGamesPlayed = (
  record: Pick<PlayerRecord, "wins" | "losses"> & { ties?: number },
) => record.wins + record.losses + (record.ties ?? 0);

export const getWinPercentage = (
  record: Pick<PlayerRecord, "wins" | "losses">,
) => {
  const games = getGamesPlayed(record);

  if (games === 0) {
    return null;
  }

  return (record.wins / games) * 100;
};

export const shouldShowWinPercentage = (
  record: Pick<PlayerRecord, "wins" | "losses">,
  minGames = MIN_GAMES_FOR_WIN_PCT,
) => getGamesPlayed(record) >= minGames;

export const formatWinPercentage = (
  record: Pick<PlayerRecord, "wins" | "losses">,
  minGames = MIN_GAMES_FOR_WIN_PCT,
) => {
  if (!shouldShowWinPercentage(record, minGames)) {
    return null;
  }

  const winPct = getWinPercentage(record);

  if (winPct === null) {
    return null;
  }

  return `${winPct.toFixed(1)}%`;
};

export const recordMatchResult = (
  result: HeadToHeadResult,
  mode: MatchRecordMode = "headToHead",
): PlayerRecord => {
  const current = loadPlayerRecord(mode);
  const nextStats = applyHeadToHeadResultToStats(current, result);

  saveModeStats(mode, nextStats);

  return {
    playerId: current.playerId,
    ...nextStats,
  };
};

export const buildLeaderboardIdentity = (
  team: TeamProfile,
  record: PlayerRecord,
) => {
  const { publicTag } = getOrCreatePlayerIdentity();

  return {
    playerId: record.playerId,
    name: team.name,
    publicTag,
    wins: record.wins,
    losses: record.losses,
    winStreak: record.winStreak,
    lossStreak: record.lossStreak,
  };
};
