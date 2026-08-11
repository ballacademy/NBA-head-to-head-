import { saveClassicProfile, loadClassicProfile } from "./classicProfile";
import { upsertLeaderboardEntry, loadLeaderboardEntries } from "./leaderboard";
import {
  getCachedRemoteLeaderboard,
  getSeasonIdForMode,
} from "./leaderboardRemote";
import { getOrCreatePlayerId } from "./playerIdentity";
import { loadRankedProfile, saveRankedProfile } from "./rankedProfile";
import {
  upsertRankedLeaderboardEntry,
  loadRankedLeaderboardEntries,
} from "./rankedLeaderboard";

/**
 * After a successful remote GET, replace a fabricated / desynced local season
 * row with the viewer entry from cache — unless local is exactly one match
 * ahead (pending POST). Keeps Casual/Pro boards from sticking on catch-up
 * inventions like 63-1 when D1 still has the real record (e.g. 27-31).
 */
export const reconcileLocalClassicLeaderboardFromRemote = (
  seasonId = getSeasonIdForMode("classic"),
): boolean => {
  const viewerPlayerId = getOrCreatePlayerId();
  const remoteEntries =
    getCachedRemoteLeaderboard("classic", "elo", seasonId) ??
    getCachedRemoteLeaderboard("classic", "winStreak", seasonId) ??
    getCachedRemoteLeaderboard("classic", "lossStreak", seasonId);
  const remoteSelf = remoteEntries?.find(
    (entry) => entry.isYou === true || entry.playerId === viewerPlayerId,
  );

  if (!remoteSelf) {
    return false;
  }

  const localSelf = loadLeaderboardEntries().find(
    (entry) => entry.playerId === viewerPlayerId,
  );
  const localGames = localSelf ? localSelf.wins + localSelf.losses : -1;
  const remoteGames = remoteSelf.wins + remoteSelf.losses;

  if (localSelf && localGames === remoteGames + 1) {
    return false;
  }

  const alreadyMatched =
    localSelf &&
    localGames === remoteGames &&
    localSelf.wins === remoteSelf.wins &&
    localSelf.losses === remoteSelf.losses &&
    localSelf.winStreak === remoteSelf.winStreak &&
    localSelf.lossStreak === remoteSelf.lossStreak &&
    localSelf.elo === remoteSelf.elo;

  if (alreadyMatched) {
    return false;
  }

  upsertLeaderboardEntry(
    {
      playerId: viewerPlayerId,
      name: remoteSelf.name,
      publicTag: remoteSelf.publicTag,
      username: remoteSelf.username,
      elo: remoteSelf.elo,
      wins: remoteSelf.wins,
      losses: remoteSelf.losses,
      winStreak: remoteSelf.winStreak,
      lossStreak: remoteSelf.lossStreak,
      isYou: true,
    },
    { sync: false },
  );

  const profile = loadClassicProfile();
  saveClassicProfile({
    ...profile,
    playerId: viewerPlayerId,
    seasonId,
    elo: remoteSelf.elo,
    peakElo: Math.max(profile.peakElo, remoteSelf.elo),
    classicGamesPlayed: remoteGames,
  });

  return true;
};

export const reconcileLocalRankedLeaderboardFromRemote = (
  seasonId = getSeasonIdForMode("ranked"),
): boolean => {
  const viewerPlayerId = getOrCreatePlayerId();
  const remoteEntries =
    getCachedRemoteLeaderboard("ranked", "elo", seasonId) ??
    getCachedRemoteLeaderboard("ranked", "winStreak", seasonId) ??
    getCachedRemoteLeaderboard("ranked", "lossStreak", seasonId);
  const remoteSelf = remoteEntries?.find(
    (entry) => entry.isYou === true || entry.playerId === viewerPlayerId,
  );

  if (!remoteSelf) {
    return false;
  }

  const localSelf = loadRankedLeaderboardEntries().find(
    (entry) => entry.playerId === viewerPlayerId,
  );
  const localGames = localSelf ? localSelf.wins + localSelf.losses : -1;
  const remoteGames = remoteSelf.wins + remoteSelf.losses;

  if (localSelf && localGames === remoteGames + 1) {
    return false;
  }

  const alreadyMatched =
    localSelf &&
    localGames === remoteGames &&
    localSelf.wins === remoteSelf.wins &&
    localSelf.losses === remoteSelf.losses &&
    localSelf.winStreak === remoteSelf.winStreak &&
    localSelf.lossStreak === remoteSelf.lossStreak &&
    localSelf.elo === remoteSelf.elo;

  if (alreadyMatched) {
    return false;
  }

  upsertRankedLeaderboardEntry(
    {
      playerId: viewerPlayerId,
      name: remoteSelf.name,
      publicTag: remoteSelf.publicTag,
      username: remoteSelf.username,
      elo: remoteSelf.elo,
      wins: remoteSelf.wins,
      losses: remoteSelf.losses,
      winStreak: remoteSelf.winStreak,
      lossStreak: remoteSelf.lossStreak,
      isNpc: false,
      isYou: true,
    },
    { sync: false },
  );

  const profile = loadRankedProfile();
  saveRankedProfile({
    ...profile,
    playerId: viewerPlayerId,
    seasonId,
    elo: remoteSelf.elo,
    peakElo: Math.max(profile.peakElo, remoteSelf.elo),
    rankedGamesPlayed: remoteGames,
  });

  return true;
};
