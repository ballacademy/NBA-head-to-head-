import { isPlayerAccountLinked } from "./accountGate";
import {
  fetchRemoteAchievements,
  pushRemoteAchievements,
} from "./achievementsApi";
import {
  loadAchievementState,
  normalizeUnlockedAchievementIds,
  saveAchievementState,
  type AchievementState,
} from "./achievements";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { emitCloudSyncError } from "./cloudSyncEvents";

let achievementsPullSucceeded = false;

export const resetAchievementsPullGate = () => {
  achievementsPullSucceeded = false;
};

export const mergeUnlockedAchievementIds = (...lists: string[][]) =>
  normalizeUnlockedAchievementIds(lists.flat());

export const pullAndMergeAchievements = async (
  playerId = getOrCreatePlayerIdentity().playerId,
): Promise<AchievementState | null> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return null;
  }

  const remote = await fetchRemoteAchievements(playerId);
  if (!remote) {
    return null;
  }

  achievementsPullSucceeded = true;

  const local = loadAchievementState();
  const mergedIds = mergeUnlockedAchievementIds(
    local.unlocked,
    remote.unlockedIds,
  );
  const next = { unlocked: mergedIds };
  saveAchievementState(next);

  // If local had unlocks the cloud was missing, push the union back.
  if (mergedIds.length > remote.unlockedIds.length) {
    void pushRemoteAchievements({
      playerId,
      unlockedIds: next.unlocked,
    });
  }

  return next;
};

export const pushAchievementsIfLinked = async (
  state?: AchievementState,
  playerId = getOrCreatePlayerIdentity().playerId,
  options: { force?: boolean } = {},
): Promise<boolean> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return false;
  }

  if (!options.force && !achievementsPullSucceeded) {
    return false;
  }

  const local = state ?? loadAchievementState();
  const pushed = await pushRemoteAchievements({
    playerId,
    unlockedIds: normalizeUnlockedAchievementIds(local.unlocked),
  });

  if (pushed) {
    achievementsPullSucceeded = true;
  } else {
    emitCloudSyncError(
      "Couldn't sync your badges to the cloud. Check your connection.",
    );
  }

  return Boolean(pushed);
};
