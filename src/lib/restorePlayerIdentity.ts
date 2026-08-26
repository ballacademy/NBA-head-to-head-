import { getBrowserStorage, removeJson } from "./browserStorage";
import {
  clearAccountLinkCache,
  isPlayerAccountLinked,
} from "./accountGate";
import {
  pullAndMergeCollection,
  pushCollectionIfLinked,
  resetCollectionPullGate,
} from "./collectionRemote";
import {
  pullAndMergeAchievements,
  pushAchievementsIfLinked,
  resetAchievementsPullGate,
} from "./achievementsRemote";
import {
  pullAndMergeCareerStats,
  pushCareerStatsIfLinked,
  resetCareerPullGate,
} from "./careerStatsRemote";
import {
  pullAndMergeNbaPlayerUsage,
  pushNbaPlayerUsageIfLinked,
  resetNbaPlayerUsagePullGate,
} from "./nbaPlayerUsageRemote";
import {
  pullAndMergeEventProfiles,
  pushEventProfilesIfLinked,
  resetEventProfilesPullGate,
} from "./eventProfileRemote";
import {
  pullAndMergeTierListLibrary,
  pushTierListLibraryIfLinked,
  resetTierListLibraryPullGate,
} from "./tierListLibraryRemote";
import { pullAndMergeDailyDraftHistory } from "./dailyDraftHistoryRemote";
import { getDailyDateKey, getDailyGoal } from "./dailyDraft";
import {
  flushLocalDailyDraftScoresToRemote,
  refreshDailyDraftScoresFromApi,
  clearDailyDraftRemoteCache,
} from "./dailyDraftScores";
import { fetchRemoteLeaderboard } from "./leaderboardApi";
import { upsertLeaderboardEntry } from "./leaderboard";
import {
  clearLeaderboardRemoteCache,
  seedRemoteLeaderboardCache,
} from "./leaderboardRemote";
import {
  createStarterCollection,
  savePlayerCollection,
} from "./playerCollection";
import {
  getOrCreatePlayerIdentity,
  mintAnonymousPlayerIdentity,
  setPlayerIdentity,
  type PlayerIdentity,
} from "./playerIdentity";
import { fetchRemotePlayerProfile } from "./playerProfileApi";
import { clearModePlayerRecords } from "./playerRecord";
import { saveClassicProfile } from "./classicProfile";
import { saveRankedProfile } from "./rankedProfile";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import { getCurrentSeasonId } from "./rankedSeason";
import {
  loadGmLegacyStats,
  mergeGmLegacyStats,
  saveGmLegacyStats,
} from "./gmLegacyStats";
import { getRecentAllStarUnlockPlayerIds } from "./allStars";
import { logoutAccount } from "./accountApi";
import { saveTeamProfile, validateTeamProfile } from "./teamProfile";
import { resetUnlockProgress } from "./unlockProgress";

const IDENTITY_BOUND_STORAGE_KEYS = [
  "nba-head-to-head-classic-profile",
  "nba-head-to-head-ranked-profile",
  "nba-head-to-head-all-time-profile",
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
  "nba-head-to-head-recorded-match-ids",
  "nba-head-to-head-live-draft-session",
  "nba-head-to-head-draft-deadline",
  "nba-head-to-head-team-profile",
  "nba-head-to-head-event-profiles",
  "nba-head-to-head-tier-list",
  "nba-head-to-head-tier-list-library",
  "nba-head-to-head-tier-list-current-updated-at",
  "nba-head-to-head-tier-list-public",
  "nba-head-to-head-community-shareables",
  "nba-head-to-head-community-muted-players",
  "nba-head-to-head-community-posts",
  "nba-head-to-head-community-rate",
  "ddgm:weekly-recap-seen",
  "ddgm:weekly-h2h",
  "ddgm:match-game-log",
  "nba-head-to-head-nba-player-usage",
  "nba-head-to-head-event-profiles:last-match",
  "nba-head-to-head-draft-onboarding-seen",
  "ddgm:daily-account-nudge-dismissed",
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

const clearIdentityBoundLocalState = (
  playerId?: string,
  options: {
    clearDailyScores?: boolean;
    /** Fresh anonymous GMs get a random starter; login restore must not. */
    seedStarterCollection?: boolean;
  } = {},
) => {
  const clearDailyScores = options.clearDailyScores !== false;
  const seedStarterCollection = options.seedStarterCollection !== false;

  if (playerId) {
    clearPendingLineupStorage(playerId);
  }

  for (const key of IDENTITY_BOUND_STORAGE_KEYS) {
    if (key === "nba-head-to-head-daily-scores" && !clearDailyScores) {
      continue;
    }
    removeJson(key);
  }

  clearModePlayerRecords();
  resetUnlockProgress();
  resetCollectionPullGate();
  resetAchievementsPullGate();
  resetCareerPullGate();
  resetNbaPlayerUsagePullGate();
  resetEventProfilesPullGate();
  resetTierListLibraryPullGate();
  clearLeaderboardRemoteCache();
  clearDailyDraftRemoteCache();
  savePlayerCollection({
    // Login restore + merge must not mint random All-Stars into the cloud union.
    unlockedIds: seedStarterCollection
      ? createStarterCollection()
      : [...getRecentAllStarUnlockPlayerIds()],
    pendingUnlock: null,
    initialized: true,
  });
};

export type LogoutIdentityResult =
  | { ok: true; identity: PlayerIdentity }
  | {
      ok: false;
      error: string;
      pendingDailyCount: number;
      pendingCloudCount: number;
    };

const flushLinkedAccountCloudState = async (
  playerId: string,
): Promise<{ ok: true } | { ok: false; failed: number }> => {
  const results = await Promise.all([
    pushCollectionIfLinked(undefined, playerId, { force: true }),
    pushAchievementsIfLinked(undefined, playerId, { force: true }),
    pushCareerStatsIfLinked(playerId, { force: true }),
    pushNbaPlayerUsageIfLinked(playerId, { force: true }),
    pushEventProfilesIfLinked(playerId, { force: true }),
    pushTierListLibraryIfLinked(playerId, { force: true }),
  ]);

  const failed = results.filter((ok) => !ok).length;
  if (failed > 0) {
    return { ok: false, failed };
  }
  return { ok: true };
};

/**
 * Logs out of the linked account on this device by minting a fresh anonymous
 * GM identity. The account itself remains; log in again to restore it.
 *
 * Flushes local Daily scores and (when the session is live) other cloud
 * progress first so an offline submit is not wiped. Pass `force: true` to
 * skip the flush after the user confirms.
 */
export const logoutToAnonymousIdentity = async (
  options: { force?: boolean } = {},
): Promise<LogoutIdentityResult> => {
  const previousPlayerId = getOrCreatePlayerIdentity().playerId;

  if (!options.force) {
    const flush = await flushLocalDailyDraftScoresToRemote(previousPlayerId);
    if (!flush.ok) {
      return {
        ok: false,
        pendingDailyCount: flush.failed,
        pendingCloudCount: 0,
        error:
          flush.failed === 1
            ? "Could not sync your Daily score before logging out. Retry, or log out anyway and risk losing it."
            : `Could not sync ${flush.failed} Daily scores before logging out. Retry, or log out anyway and risk losing them.`,
      };
    }

    // Session already gone — cannot push; don't block logout on that.
    if (await isPlayerAccountLinked(previousPlayerId)) {
      const cloudFlush = await flushLinkedAccountCloudState(previousPlayerId);
      if (!cloudFlush.ok) {
        return {
          ok: false,
          pendingDailyCount: 0,
          pendingCloudCount: cloudFlush.failed,
          error:
            cloudFlush.failed === 1
              ? "Could not sync cloud progress before logging out. Retry, or log out anyway and risk losing recent collection, badges, or career updates."
              : `Could not sync ${cloudFlush.failed} cloud progress items before logging out. Retry, or log out anyway and risk losing recent updates.`,
        };
      }
    }
  }

  await logoutAccount();
  clearIdentityBoundLocalState(previousPlayerId);
  clearAccountLinkCache();
  return { ok: true, identity: mintAnonymousPlayerIdentity() };
};

/**
 * Restores a GM identity after login without carrying over another browser's
 * local records (which would clobber server leaderboard rows on the next sync).
 */
export const restorePlayerIdentityFromLogin = async (playerId: string) => {
  const previousPlayerId = getOrCreatePlayerIdentity().playerId;
  // Keep Daily history on login — entries are playerId-tagged, and logout is
  // the path that should wipe them. Season boards are not career W–L.
  // Do not seed a random starter collection — that would farm All-Stars into
  // the cloud on every logout→login merge.
  clearIdentityBoundLocalState(previousPlayerId, {
    clearDailyScores: false,
    seedStarterCollection: false,
  });
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

  if (profile?.legacy) {
    saveGmLegacyStats(
      mergeGmLegacyStats(loadGmLegacyStats(), {
        ...profile.legacy,
        playerId,
      }),
    );
  }

  if (currentElo != null) {
    // Season peak is not published remotely — seed from current Elo only.
    // All-time peak lives in gm-legacy-stats (merged above).
    saveRankedProfile({
      playerId,
      seasonId,
      elo: currentElo,
      peakElo: currentElo,
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

  // Career mode records + All-Time banners sync from the cloud (not monthly boards).
  // Collection / achievements / career pull set gates so we never push a thin
  // local snapshot before a successful remote read.

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

  await pullAndMergeCollection(playerId);
  await pullAndMergeAchievements(playerId);
  await pullAndMergeCareerStats(playerId);
  await pullAndMergeNbaPlayerUsage(playerId);
  await pullAndMergeEventProfiles(playerId);
  await pullAndMergeTierListLibrary(playerId);
  await pullAndMergeDailyDraftHistory(playerId);

  const dateKey = getDailyDateKey();
  await Promise.all([
    refreshDailyDraftScoresFromApi(
      dateKey,
      getDailyGoal(dateKey, "basic").id,
      playerId,
      "basic",
    ),
    refreshDailyDraftScoresFromApi(
      dateKey,
      getDailyGoal(dateKey, "advanced").id,
      playerId,
      "advanced",
    ),
  ]);

  return identity;
};
