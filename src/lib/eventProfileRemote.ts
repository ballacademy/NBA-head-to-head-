import { isPlayerAccountLinked } from "./accountGate";
import {
  fetchRemoteEventProfiles,
  pushRemoteEventProfiles,
} from "./eventProfileApi";
import {
  loadEventProfilesPayload,
  saveEventProfilesPayload,
} from "./eventProfile";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { mergeEventProfilesPayload } from "./eventProfileShared";

let eventProfilesPullSucceeded = false;

export const resetEventProfilesPullGate = () => {
  eventProfilesPullSucceeded = false;
};

export const hasSuccessfulEventProfilesPull = () => eventProfilesPullSucceeded;

export const pullAndMergeEventProfiles = async (
  playerId = getOrCreatePlayerIdentity().playerId,
) => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return null;
  }

  const remote = await fetchRemoteEventProfiles(playerId);
  if (!remote) {
    return null;
  }

  eventProfilesPullSucceeded = true;
  const local = loadEventProfilesPayload();
  const merged = mergeEventProfilesPayload(local, remote.profiles);
  saveEventProfilesPayload(merged);

  const localGrew =
    JSON.stringify(merged) !== JSON.stringify(remote.profiles);
  if (localGrew) {
    void pushRemoteEventProfiles({ playerId, profiles: merged });
  }

  return merged;
};

export const pushEventProfilesIfLinked = async (
  playerId = getOrCreatePlayerIdentity().playerId,
  options: { force?: boolean } = {},
): Promise<boolean> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return false;
  }

  if (!options.force && !eventProfilesPullSucceeded) {
    return false;
  }

  const local = loadEventProfilesPayload();
  const pushed = await pushRemoteEventProfiles({ playerId, profiles: local });
  if (pushed) {
    eventProfilesPullSucceeded = true;
    saveEventProfilesPayload(pushed.profiles);
  }

  return Boolean(pushed);
};
