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

  // Align local season rows with remote after every successful fetch — not only
  // when the Ranks page mounts.
  const {
    reconcileLocalClassicLeaderboardFromRemote,
    reconcileLocalRankedLeaderboardFromRemote,
  } = await import("./reconcileLeaderboardSelf");
  if (params.mode === "ranked") {
    reconcileLocalRankedLeaderboardFromRemote(seasonId);
  } else {
    reconcileLocalClassicLeaderboardFromRemote(seasonId);
  }

  return true;
};

export const getCachedRemoteLeaderboard = (
  mode: LeaderboardMode,
  sort: LeaderboardSort,
  seasonId = getSeasonIdForMode(mode),
) => remoteCache.get(cacheKey(mode, seasonId, sort))?.entries;

/** Seed the in-memory remote cache after login restore (no extra network). */
export const seedRemoteLeaderboardCache = (params: {
  mode: LeaderboardMode;
  seasonId: string;
  sort: LeaderboardSort;
  entries: RemoteLeaderboardEntry[];
}) => {
  remoteCache.set(cacheKey(params.mode, params.seasonId, params.sort), {
    entries: params.entries,
    fetchedAt: Date.now(),
  });
};

const sortRemoteEntries = (
  entries: RemoteLeaderboardEntry[],
  sort: LeaderboardSort,
) => {
  const copy = [...entries];
  switch (sort) {
    case "winStreak":
      return copy.sort(
        (left, right) =>
          right.winStreak - left.winStreak ||
          right.wins - left.wins ||
          left.name.localeCompare(right.name),
      );
    case "lossStreak":
      return copy.sort(
        (left, right) =>
          right.lossStreak - left.lossStreak ||
          right.losses - left.losses ||
          left.name.localeCompare(right.name),
      );
    default:
      return copy.sort(
        (left, right) =>
          right.elo - left.elo ||
          right.wins - left.wins ||
          left.name.localeCompare(right.name),
      );
  }
};

type LeaderboardSelfLike = {
  playerId: string;
  name: string;
  publicTag: string;
  username?: string;
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  updatedAt: string;
  isYou?: boolean;
};

/**
 * Overlay the viewer's local season row onto a remote board only when local
 * is a plausible one-match (or cosmetic) ahead of remote. Prevents Ranks
 * from showing a stale remote cache after a successful local upsert whose
 * POST failed — without letting a fabricated multi-game local row (e.g.
 * desync catch-up writing 63-0) override the real remote record.
 */
export const mergeLocalSelfIntoRemoteEntries = <T extends LeaderboardSelfLike>(
  remoteEntries: T[],
  localSelf: LeaderboardSelfLike | null | undefined,
  viewerPlayerId: string,
): T[] => {
  if (!localSelf || !viewerPlayerId) {
    return remoteEntries;
  }

  const remoteIndex = remoteEntries.findIndex(
    (entry) =>
      entry.isYou === true || entry.playerId === viewerPlayerId,
  );
  const remoteSelf = remoteIndex >= 0 ? remoteEntries[remoteIndex] : null;
  const localGames = localSelf.wins + localSelf.losses;
  const remoteGames = remoteSelf
    ? remoteSelf.wins + remoteSelf.losses
    : -1;

  // No remote self yet — show the local season row.
  if (!remoteSelf) {
    const mergedSelf = {
      ...localSelf,
      playerId: viewerPlayerId,
      isYou: true as const,
    } as T;
    return [...remoteEntries, mergedSelf];
  }

  const localOneMatchAhead = localGames === remoteGames + 1;
  const localNewerSameGames =
    localGames === remoteGames &&
    localSelf.updatedAt > remoteSelf.updatedAt;

  if (!localOneMatchAhead && !localNewerSameGames) {
    return remoteEntries;
  }

  // Keep the account username from remote when a local name-only upsert
  // omitted it (team rename should not drop @username on Ranks).
  const mergedSelf = {
    ...remoteSelf,
    ...localSelf,
    playerId: viewerPlayerId,
    isYou: true as const,
    username: localSelf.username ?? remoteSelf.username,
  } as T;
  const without = remoteEntries.filter(
    (entry) =>
      entry.isYou !== true && entry.playerId !== viewerPlayerId,
  );
  return [...without, mergedSelf];
};

/** Patch every sort cache so Ranks reflects a local upsert immediately. */
export const patchCachedRemoteLeaderboardSelf = (params: {
  mode: LeaderboardMode;
  seasonId?: string;
  entry: RemoteLeaderboardEntry;
}) => {
  const seasonId = params.seasonId ?? getSeasonIdForMode(params.mode);

  for (const sort of ["elo", "winStreak", "lossStreak"] as const) {
    const key = cacheKey(params.mode, seasonId, sort);
    const cached = remoteCache.get(key);
    if (!cached?.entries.length) {
      continue;
    }

    const previousSelf = cached.entries.find(
      (entry) =>
        entry.isYou === true || entry.playerId === params.entry.playerId,
    );
    const selfEntry: RemoteLeaderboardEntry = {
      ...params.entry,
      username: params.entry.username ?? previousSelf?.username,
      isYou: true,
    };

    const without = cached.entries.filter(
      (entry) =>
        entry.isYou !== true && entry.playerId !== selfEntry.playerId,
    );
    remoteCache.set(key, {
      entries: sortRemoteEntries([...without, selfEntry], sort),
      fetchedAt: Date.now(),
    });
  }
};

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
