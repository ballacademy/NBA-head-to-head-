import { removeJson } from "./browserStorage";
import { fetchRemoteLeaderboard } from "./leaderboardApi";
import {
  createStarterCollection,
  savePlayerCollection,
} from "./playerCollection";
import { setPlayerIdentity } from "./playerIdentity";
import { fetchRemotePlayerProfile } from "./playerProfileApi";
import {
  clearModePlayerRecords,
  replaceModePlayerRecords,
} from "./playerRecord";
import { saveClassicProfile } from "./classicProfile";
import { saveRankedProfile } from "./rankedProfile";
import { getCurrentSeasonId } from "./rankedSeason";
import { resetUnlockProgress } from "./unlockProgress";

const IDENTITY_BOUND_STORAGE_KEYS = [
  "nba-head-to-head-classic-profile",
  "nba-head-to-head-ranked-profile",
  "nba-head-to-head-player-records-by-mode",
  "nba-head-to-head-player-record",
  "nba-head-to-head-player-collection",
  "nba-head-to-head-last-unlock-match",
  "nba-head-to-head-unlock-progress",
  "nba-head-to-head-daily-scores",
  "nba-head-to-head-leaderboard",
  "nba-head-to-head-ranked-leaderboard",
  "nba-head-to-head-ranked-npc-pool",
  "nba-head-to-head-gm-legacy-stats",
  "nba-head-to-head-achievements",
  "nba-head-to-head-last-recorded-match",
  "nba-head-to-head-last-match-outcome",
  "nba-head-to-head-live-draft-session",
  "nba-head-to-head-draft-deadline",
] as const;

const clearIdentityBoundLocalState = () => {
  for (const key of IDENTITY_BOUND_STORAGE_KEYS) {
    removeJson(key);
  }

  clearModePlayerRecords();
  resetUnlockProgress();
  savePlayerCollection({
    unlockedIds: createStarterCollection(),
    pendingUnlock: null,
    initialized: true,
  });
};

/**
 * Restores a GM identity after login without carrying over another browser's
 * local records (which would clobber server leaderboard rows on the next sync).
 */
export const restorePlayerIdentityFromLogin = async (playerId: string) => {
  clearIdentityBoundLocalState();
  const identity = setPlayerIdentity(playerId);
  const seasonId = getCurrentSeasonId();

  const [rankedBoard, classicBoard, profile] = await Promise.all([
    fetchRemoteLeaderboard({
      mode: "ranked",
      seasonId,
      sort: "elo",
      limit: 500,
      viewerPlayerId: playerId,
    }),
    fetchRemoteLeaderboard({
      mode: "classic",
      sort: "elo",
      limit: 500,
      viewerPlayerId: playerId,
    }),
    fetchRemotePlayerProfile({ playerId, seasonId }),
  ]);

  const rankedEntry =
    rankedBoard?.entries.find(
      (entry) => entry.isYou || entry.playerId === playerId,
    ) ?? null;
  const classicEntry =
    classicBoard?.entries.find(
      (entry) => entry.isYou || entry.playerId === playerId,
    ) ?? null;

  const currentElo =
    profile?.currentSeason?.elo ?? rankedEntry?.elo ?? null;
  const currentWins =
    profile?.currentSeason?.wins ?? rankedEntry?.wins ?? 0;
  const currentLosses =
    profile?.currentSeason?.losses ?? rankedEntry?.losses ?? 0;
  const legacyPeak = profile?.legacy?.peakElo ?? null;

  if (currentElo != null) {
    saveRankedProfile({
      playerId,
      seasonId,
      elo: currentElo,
      peakElo: Math.max(currentElo, legacyPeak ?? currentElo),
      rankedGamesPlayed: Math.max(0, currentWins + currentLosses),
    });
  }

  if (classicEntry) {
    saveClassicProfile({
      playerId,
      elo: classicEntry.elo,
      peakElo: classicEntry.elo,
      classicGamesPlayed: Math.max(
        0,
        classicEntry.wins + classicEntry.losses,
      ),
    });
  }

  replaceModePlayerRecords({
    ranked:
      rankedEntry || profile?.currentSeason
        ? {
            wins: currentWins,
            losses: currentLosses,
            winStreak: rankedEntry?.winStreak ?? 0,
            lossStreak: rankedEntry?.lossStreak ?? 0,
          }
        : undefined,
    headToHead: classicEntry
      ? {
          wins: classicEntry.wins,
          losses: classicEntry.losses,
          winStreak: classicEntry.winStreak,
          lossStreak: classicEntry.lossStreak,
        }
      : undefined,
  });

  return identity;
};
