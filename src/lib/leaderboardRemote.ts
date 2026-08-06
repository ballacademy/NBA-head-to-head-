import {
  fetchRemoteLeaderboard,
  submitRemoteLeaderboardEntry,
  type LeaderboardMode,
  type LeaderboardSort,
  type RemoteLeaderboardEntry,
} from "./leaderboardApi";
import { isPlayerAccountLinked } from "./accountGate";
import { getOrCreatePlayerId } from "./playerIdentity";
import { getCurrentSeasonId } from "./rankedSeason";

interface RemoteLeaderboardCache {
  entries: RemoteLeaderboardEntry[];
  fetchedAt: number;
}

const remoteCache = new Map<string, RemoteLeaderboardCache>();

const cacheKey = (
  mode: LeaderboardMode,
  seasonId: string,
  sort: LeaderboardSort,
) => `${mode}:${seasonId}:${sort}`;

export const getSeasonIdForMode = (mode: LeaderboardMode) => {
  void mode;
  return getCurrentSeasonId();
};

export const refreshLeaderboardFromApi = async (params: {
  mode: LeaderboardMode;
  sort: LeaderboardSort;
  limit: number;
  seasonId?: string;
}) => {
  const seasonId = params.seasonId ?? getSeasonIdForMode(params.mode);
  const remote = await fetchRemoteLeaderboard({
    mode: params.mode,
    seasonId,
    sort: params.sort,
    limit: params.limit,
    viewerPlayerId: getOrCreatePlayerId(),
  });

  if (!remote) {
    return false;
  }

  remoteCache.set(cacheKey(params.mode, seasonId, params.sort), {
    entries: remote.entries,
    fetchedAt: Date.now(),
  });

  return true;
};

export const getCachedRemoteLeaderboard = (
  mode: LeaderboardMode,
  sort: LeaderboardSort,
  seasonId = getSeasonIdForMode(mode),
) => remoteCache.get(cacheKey(mode, seasonId, sort))?.entries;

export const syncLeaderboardEntryToApi = (params: {
  mode: LeaderboardMode;
  playerId: string;
  teamName: string;
  publicTag: string;
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  seasonId?: string;
}) => {
  void confirmRemoteLeaderboardRank(params);
};

/** Submit the entry, refresh remote boards, and return 1-based Elo rank. */
export const confirmRemoteLeaderboardRank = async (params: {
  mode: LeaderboardMode;
  playerId: string;
  teamName: string;
  publicTag: string;
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  seasonId?: string;
}): Promise<number | null> => {
  const seasonId = params.seasonId ?? getSeasonIdForMode(params.mode);

  if (!(await isPlayerAccountLinked(params.playerId))) {
    return null;
  }

  const submitted = await submitRemoteLeaderboardEntry({
    mode: params.mode,
    seasonId,
    playerId: params.playerId,
    teamName: params.teamName,
    publicTag: params.publicTag,
    elo: params.elo,
    wins: params.wins,
    losses: params.losses,
    winStreak: params.winStreak,
    lossStreak: params.lossStreak,
  });

  if (!submitted) {
    return null;
  }

  for (const sort of ["elo", "winStreak", "lossStreak"] as const) {
    await refreshLeaderboardFromApi({
      mode: params.mode,
      sort,
      limit: 500,
      seasonId,
    });
  }

  const entries = getCachedRemoteLeaderboard(params.mode, "elo", seasonId);
  if (!entries?.length) {
    return null;
  }

  const index = entries.findIndex(
    (entry) => entry.isYou === true || entry.playerId === params.playerId,
  );

  return index >= 0 ? index + 1 : null;
};

export const clearLeaderboardRemoteCacheForTests = () => {
  remoteCache.clear();
};
