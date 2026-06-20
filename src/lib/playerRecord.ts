import { readJson, writeJson } from "./browserStorage";
import type { TeamProfile } from "./teamProfile";

const PLAYER_ID_KEY = "nba-head-to-head-player-id";
const PLAYER_RECORDS_KEY = "nba-head-to-head-player-records-by-mode";
const LEGACY_PLAYER_RECORD_KEY = "nba-head-to-head-player-record";

export const MIN_GAMES_FOR_WIN_PCT = 20;

export type MatchRecordMode = "headToHead" | "ranked" | "allTime";

export const MATCH_RECORD_MODES: MatchRecordMode[] = [
  "headToHead",
  "ranked",
  "allTime",
];

export interface PlayerRecord {
  playerId: string;
  wins: number;
  losses: number;
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

const createPlayerId = () => {
  const cryptoApi = (globalThis as typeof globalThis & {
    crypto?: { randomUUID: () => string };
  }).crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const emptyModeStats = (): ModeRecordStats => ({
  wins: 0,
  losses: 0,
  winStreak: 0,
  lossStreak: 0,
});

const normalizeModeStats = (saved?: Partial<ModeRecordStats>): ModeRecordStats => ({
  wins: saved?.wins ?? 0,
  losses: saved?.losses ?? 0,
  winStreak: saved?.winStreak ?? 0,
  lossStreak: saved?.lossStreak ?? 0,
});

export const getOrCreatePlayerId = () => {
  const storage = readJson<{ playerId: string }>(PLAYER_ID_KEY);

  if (storage?.playerId) {
    return storage.playerId;
  }

  const playerId = createPlayerId();
  writeJson(PLAYER_ID_KEY, { playerId });

  return playerId;
};

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
  const playerId = getOrCreatePlayerId();
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

export const formatPlayerRecord = (record: Pick<PlayerRecord, "wins" | "losses">) =>
  `${record.wins}-${record.losses}`;

export const getGamesPlayed = (record: Pick<PlayerRecord, "wins" | "losses">) =>
  record.wins + record.losses;

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
  userWon: boolean,
  mode: MatchRecordMode = "headToHead",
): PlayerRecord => {
  const current = loadPlayerRecord(mode);
  const nextStats: ModeRecordStats = {
    wins: current.wins + (userWon ? 1 : 0),
    losses: current.losses + (userWon ? 0 : 1),
    winStreak: userWon ? current.winStreak + 1 : 0,
    lossStreak: userWon ? 0 : current.lossStreak + 1,
  };

  saveModeStats(mode, nextStats);

  return {
    playerId: current.playerId,
    ...nextStats,
  };
};

export const buildLeaderboardIdentity = (
  team: TeamProfile,
  record: PlayerRecord,
) => ({
  playerId: record.playerId,
  name: team.name,
  wins: record.wins,
  losses: record.losses,
  winStreak: record.winStreak,
  lossStreak: record.lossStreak,
});
