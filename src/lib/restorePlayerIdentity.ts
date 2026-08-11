import { getBrowserStorage, removeJson } from "./browserStorage";
import { clearAccountLinkCache } from "./accountGate";
import { pullAndMergeCollection } from "./collectionRemote";
import { pullAndMergeAchievements } from "./achievementsRemote";
import { fetchRemoteLeaderboard } from "./leaderboardApi";
import { upsertLeaderboardEntry } from "./leaderboard";
import { seedRemoteLeaderboardCache } from "./leaderboardRemote";
import {
  createStarterCollection,
  savePlayerCollection,
} from "./playerCollection";
import {
  getOrCreatePlayerIdentity,
  mintAnonymousPlayerIdentity,
  setPlayerIdentity,
} from "./playerIdentity";
import { fetchRemotePlayerProfile } from "./playerProfileApi";
import {
  clearModePlayerRecords,
  replaceModePlayerRecords,
} from "./playerRecord";
import { saveClassicProfile } from "./classicProfile";
import { saveRankedProfile } from "./rankedProfile";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import { getCurrentSeasonId } from "./rankedSeason";
import { saveTeamProfile, validateTeamProfile } from "./teamProfile";
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
  "nba-head-to-head-team-profile",
  "nba-head-to-head-event-profiles",
  "nba-head-to-head-tier-list",
  "nba-head-to-head-tier-list-library",
  "nba-head-to-head-tier-list-public",
] as const;

const PENDING_LINEUP_KEY_PREFIX = "nba-head-to-head-pending-lineup-";

const clearPendingLineupStorage = (playerId: string) => {
  for (const mode of ["classic", "ranked", "event"] as const) {
    removeJson(`${PENDING_LINEUP_KEY_PREFIX}${mode}-${playerId}`);
  }

  const storage = getBrowserStorage() as
    | (ReturnType<typeof getBrowserStorage> & {
        length?: number;
        key?: (index: number) => string | null;
      })
    | null;

  if (!storage?.key || typeof storage.length !== "number") {
    return;
  }

  const toRemove: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(PENDING_LINEUP_KEY_PREFIX)) {
      toRemove.push(key);
    }
  }

  for (const key of toRemove) {
    removeJson(key);
  }
};

const clearIdentityBoundLocalState = (playerId?: string) => {
  if (playerId) {
    clearPendingLineupStorage(playerId);
  }

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
 * Logs out of the linked account on this device by minting a fresh anonymous
 * GM identity. The account itself remains; log in again to restore it.
 */
export const logoutToAnonymousIdentity = () => {
  const previousPlayerId = getOrCreatePlayerIdentity().playerId;
  clearIdentityBoundLocalState(previousPlayerId);
  clearAccountLinkCache();
  return mintAnonymousPlayerIdentity();
};

/**
 * Restores a GM identity after login without carrying over another browser's
 * local records (which would clobber server leaderboard rows on the next sync).
 */
export const restorePlayerIdentityFromLogin = async (playerId: string) => {
  const previousPlayerId = getOrCreatePlayerIdentity().playerId;
  clearIdentityBoundLocalState(previousPlayerId);
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
      seasonId,
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
      seasonId,
      elo: classicEntry.elo,
      peakElo: classicEntry.elo,
      classicGamesPlayed: Math.max(
        0,
        classicEntry.wins + classicEntry.losses,
      ),
    });

    // Seed the local season row so the next match upserts from the real W–L
    // instead of synthesizing a catch-up record that remote rejects.
    upsertLeaderboardEntry(
      {
        playerId,
        name: classicEntry.name,
        publicTag: classicEntry.publicTag,
        username: classicEntry.username,
        elo: classicEntry.elo,
        wins: classicEntry.wins,
        losses: classicEntry.losses,
        winStreak: classicEntry.winStreak,
        lossStreak: classicEntry.lossStreak,
        isYou: true,
      },
      { sync: false },
    );
  }

  if (rankedEntry) {
    upsertRankedLeaderboardEntry(
      {
        playerId,
        name: rankedEntry.name,
        publicTag: rankedEntry.publicTag,
        username: rankedEntry.username,
        elo: rankedEntry.elo,
        wins: rankedEntry.wins,
        losses: rankedEntry.losses,
        winStreak: rankedEntry.winStreak,
        lossStreak: rankedEntry.lossStreak,
        isNpc: false,
        isYou: true,
      },
      { sync: false },
    );
  } else if (
    profile?.currentSeason &&
    currentElo != null &&
    currentWins + currentLosses > 0
  ) {
    // Off the published Top 500 but still has a season row via profile.
    upsertRankedLeaderboardEntry(
      {
        playerId,
        name: profile.currentSeason.teamName || "My Team",
        publicTag: profile.currentSeason.publicTag || identity.publicTag,
        username: profile.currentSeason.username ?? profile.username,
        elo: currentElo,
        wins: currentWins,
        losses: currentLosses,
        winStreak: profile.currentSeason.winStreak ?? 0,
        lossStreak: profile.currentSeason.lossStreak ?? 0,
        isNpc: false,
        isYou: true,
      },
      { sync: false },
    );
  }

  if (rankedBoard) {
    seedRemoteLeaderboardCache({
      mode: "ranked",
      seasonId,
      sort: "elo",
      entries: rankedBoard.entries,
    });
  }

  if (classicBoard) {
    seedRemoteLeaderboardCache({
      mode: "classic",
      seasonId,
      sort: "elo",
      entries: classicBoard.entries,
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

  const restoredTeamName =
    classicEntry?.name?.trim() ||
    rankedEntry?.name?.trim() ||
    profile?.currentSeason?.teamName?.trim() ||
    "";
  const validatedTeam = restoredTeamName
    ? validateTeamProfile(restoredTeamName)
    : null;
  if (validatedTeam?.ok) {
    saveTeamProfile(validatedTeam.profile, { syncLeaderboards: false });
  }

  // Restore cloud collection + badges for this account (union with any local).
  await pullAndMergeCollection(playerId);
  await pullAndMergeAchievements(playerId);

  return identity;
};
