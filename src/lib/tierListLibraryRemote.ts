import { isPlayerAccountLinked } from "./accountGate";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import {
  fetchRemoteTierListLibrary,
  pushRemoteTierListLibrary,
} from "./tierListLibraryApi";
import {
  applyTierListAccountLocally,
  snapshotLocalTierListAccount,
} from "./tierList";
import { mergeTierListAccountPayload } from "./tierListLibraryShared";

let tierListLibraryPullSucceeded = false;

export const resetTierListLibraryPullGate = () => {
  tierListLibraryPullSucceeded = false;
};

export const hasSuccessfulTierListLibraryPull = () =>
  tierListLibraryPullSucceeded;

export const pullAndMergeTierListLibrary = async (
  playerId = getOrCreatePlayerIdentity().playerId,
) => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return null;
  }

  const remote = await fetchRemoteTierListLibrary(playerId);
  if (!remote) {
    return null;
  }

  tierListLibraryPullSucceeded = true;
  const local = snapshotLocalTierListAccount();
  const merged = mergeTierListAccountPayload(local, remote.library);
  applyTierListAccountLocally(merged);

  const localGrew =
    JSON.stringify(merged) !== JSON.stringify(remote.library);
  if (localGrew) {
    void pushRemoteTierListLibrary({ playerId, library: merged });
  }

  return merged;
};

export const pushTierListLibraryIfLinked = async (
  playerId = getOrCreatePlayerIdentity().playerId,
  options: { force?: boolean } = {},
): Promise<boolean> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return false;
  }

  if (!options.force && !tierListLibraryPullSucceeded) {
    return false;
  }

  const local = snapshotLocalTierListAccount();
  const pushed = await pushRemoteTierListLibrary({ playerId, library: local });
  if (pushed) {
    tierListLibraryPullSucceeded = true;
    applyTierListAccountLocally(pushed.library);
  }

  return Boolean(pushed);
};
