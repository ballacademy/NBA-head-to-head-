import {
  fetchRemoteLeaderboard,
  submitRemoteLeaderboardEntry,
  type LeaderboardMode,
  type LeaderboardSort,
  type RemoteLeaderboardEntry,
} from "./leaderboardApi";
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

export const getSeasonIdForMode = (mode: LeaderboardMode) =>
  mode === "ranked" ? getCurrentSeasonId() : "";

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
  const seasonId = params.seasonId ?? getSeasonIdForMode(params.mode);

  void (async () => {
    await submitRemoteLeaderboardEntry({
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

    for (const sort of ["elo", "winStreak", "lossStreak"] as const) {
      await refreshLeaderboardFromApi({
        mode: params.mode,
        sort,
        limit: params.mode === "ranked" ? 500 : 100,
        seasonId,
      });
    }
  })();
};

export const clearLeaderboardRemoteCacheForTests = () => {
  remoteCache.clear();
};
