import { isPlayerAccountLinked } from "./accountGate";
import {
  fetchRemoteCollection,
  pushRemoteCollection,
} from "./collectionApi";
import {
  filterCollectibleUnlockedIds,
  loadPlayerCollection,
  savePlayerCollection,
  withRecentAllStarsUnlocked,
  type PlayerCollection,
} from "./playerCollection";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { emitCloudSyncError } from "./cloudSyncEvents";

let collectionPullSucceeded = false;

export const resetCollectionPullGate = () => {
  collectionPullSucceeded = false;
};

export const hasSuccessfulCollectionPull = () => collectionPullSucceeded;

export const mergeUnlockedIds = (...lists: string[][]) => {
  const next: string[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    for (const id of filterCollectibleUnlockedIds(list)) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      next.push(id);
    }
  }

  return next;
};

export const pullAndMergeCollection = async (
  playerId = getOrCreatePlayerIdentity().playerId,
): Promise<PlayerCollection | null> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return null;
  }

  const remote = await fetchRemoteCollection(playerId);
  if (!remote) {
    return null;
  }

  collectionPullSucceeded = true;

  const local = loadPlayerCollection();
  const mergedIds = mergeUnlockedIds(local.unlockedIds, remote.unlockedIds);
  const next = withRecentAllStarsUnlocked({
    ...local,
    unlockedIds: mergedIds,
    initialized: true,
  });

  savePlayerCollection(next);

  // If local had unlocks the cloud was missing, push the union back.
  if (mergedIds.length > remote.unlockedIds.length) {
    void pushRemoteCollection({
      playerId,
      unlockedIds: next.unlockedIds,
    });
  }

  return next;
};

export const pushCollectionIfLinked = async (
  collection?: PlayerCollection,
  playerId = getOrCreatePlayerIdentity().playerId,
  options: { force?: boolean } = {},
): Promise<boolean> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return false;
  }

  // Never upload a thin post-login local set before we've read the cloud.
  if (!options.force && !collectionPullSucceeded) {
    return false;
  }

  const local = collection ?? loadPlayerCollection();
  const pushed = await pushRemoteCollection({
    playerId,
    unlockedIds: filterCollectibleUnlockedIds(local.unlockedIds),
  });

  if (pushed) {
    collectionPullSucceeded = true;
  } else {
    emitCloudSyncError(
      "Couldn't sync your collection to the cloud. Check your connection.",
    );
  }

  return Boolean(pushed);
};
