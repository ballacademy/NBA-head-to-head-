import { isPlayerAccountLinked } from "./accountGate";
import {
  fetchRemoteNbaPlayerUsage,
  pushRemoteNbaPlayerUsage,
} from "./nbaPlayerUsageApi";
import {
  loadNbaPlayerUsageStore,
  saveNbaPlayerUsageStore,
} from "./nbaPlayerUsage";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { mergeNbaPlayerUsageStore } from "./nbaPlayerUsageShared";

let usagePullSucceeded = false;

export const resetNbaPlayerUsagePullGate = () => {
  usagePullSucceeded = false;
};

export const hasSuccessfulNbaPlayerUsagePull = () => usagePullSucceeded;

export const pullAndMergeNbaPlayerUsage = async (
  playerId = getOrCreatePlayerIdentity().playerId,
) => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return null;
  }

  const remote = await fetchRemoteNbaPlayerUsage(playerId);
  if (!remote) {
    return null;
  }

  usagePullSucceeded = true;
  const local = loadNbaPlayerUsageStore();
  const merged = mergeNbaPlayerUsageStore(local, remote.usage);
  saveNbaPlayerUsageStore(merged);

  const localGrew =
    JSON.stringify(merged) !== JSON.stringify(remote.usage);
  if (localGrew) {
    void pushRemoteNbaPlayerUsage({ playerId, usage: merged });
  }

  return merged;
};

export const pushNbaPlayerUsageIfLinked = async (
  playerId = getOrCreatePlayerIdentity().playerId,
  options: { force?: boolean } = {},
): Promise<boolean> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return false;
  }

  if (!options.force && !usagePullSucceeded) {
    return false;
  }

  const local = loadNbaPlayerUsageStore();
  const pushed = await pushRemoteNbaPlayerUsage({ playerId, usage: local });
  if (pushed) {
    usagePullSucceeded = true;
    saveNbaPlayerUsageStore(pushed.usage);
  }

  return Boolean(pushed);
};
