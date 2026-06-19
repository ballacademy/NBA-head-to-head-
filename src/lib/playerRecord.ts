import { readJson, writeJson } from "./browserStorage";
import type { TeamProfile } from "./teamProfile";

const PLAYER_ID_KEY = "nba-head-to-head-player-id";
const PLAYER_RECORD_KEY = "nba-head-to-head-player-record";

export const MIN_GAMES_FOR_WIN_PCT = 20;

export interface PlayerRecord {
  playerId: string;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
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

export const getOrCreatePlayerId = () => {
  const storage = readJson<{ playerId: string }>(PLAYER_ID_KEY);

  if (storage?.playerId) {
    return storage.playerId;
  }

  const playerId = createPlayerId();
  writeJson(PLAYER_ID_KEY, { playerId });

  return playerId;
};

export const loadPlayerRecord = (): PlayerRecord => {
  const playerId = getOrCreatePlayerId();
  const saved = readJson<Partial<PlayerRecord>>(PLAYER_RECORD_KEY);

  return {
    playerId,
    wins: saved?.wins ?? 0,
    losses: saved?.losses ?? 0,
    winStreak: saved?.winStreak ?? 0,
    lossStreak: saved?.lossStreak ?? 0,
  };
};

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

export const recordMatchResult = (userWon: boolean): PlayerRecord => {
  const current = loadPlayerRecord();
  const next: PlayerRecord = {
    ...current,
    wins: current.wins + (userWon ? 1 : 0),
    losses: current.losses + (userWon ? 0 : 1),
    winStreak: userWon ? current.winStreak + 1 : 0,
    lossStreak: userWon ? 0 : current.lossStreak + 1,
  };

  writeJson(PLAYER_RECORD_KEY, next);

  return next;
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
