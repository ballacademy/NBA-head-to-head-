import {
  applyComposerLibraryFile,
  exportComposerLibrary,
  mergeComposerLibraryFiles,
} from "../instagramComposer/composerLibrary";
import { isPlayerAccountLinked, peekCachedAccountLinked } from "./accountGate";
import {
  fetchRemoteComposerLibrary,
  pushRemoteComposerLibrary,
} from "./composerLibraryApi";
import { getOrCreatePlayerIdentity } from "./playerIdentity";

let composerLibraryPullSucceeded = false;
let composerLibraryPullAttempted = false;
let composerLibraryPullInFlight: Promise<ReturnType<
  typeof mergeComposerLibraryFiles
> | null> | null = null;

export const resetComposerLibraryPullGate = () => {
  composerLibraryPullSucceeded = false;
  composerLibraryPullAttempted = false;
  composerLibraryPullInFlight = null;
};

export const pullAndMergeComposerLibrary = async (
  playerId = getOrCreatePlayerIdentity().playerId,
) => {
  if (composerLibraryPullSucceeded) {
    return null;
  }
  if (peekCachedAccountLinked(playerId) !== true) {
    return null;
  }
  if (composerLibraryPullInFlight) {
    return composerLibraryPullInFlight;
  }
  if (composerLibraryPullAttempted) {
    return null;
  }
  composerLibraryPullAttempted = true;
  composerLibraryPullInFlight = pullComposerLibraryOnce(playerId);
  try {
    return await composerLibraryPullInFlight;
  } finally {
    composerLibraryPullInFlight = null;
  }
};

const pullComposerLibraryOnce = async (playerId: string) => {
  const remote = await fetchRemoteComposerLibrary(playerId);
  if (!remote?.library) {
    return null;
  }
  composerLibraryPullSucceeded = true;
  const merged = mergeComposerLibraryFiles(exportComposerLibrary(), remote.library);
  applyComposerLibraryFile(merged);
  if (JSON.stringify(merged) !== JSON.stringify(remote.library)) {
    void pushRemoteComposerLibrary({ playerId, library: merged });
  }
  return merged;
};

export const pushComposerLibraryIfLinked = async (
  options: { playerId?: string; force?: boolean } = {},
): Promise<boolean> => {
  const playerId =
    options.playerId ?? getOrCreatePlayerIdentity().playerId;
  if (!playerId.trim()) {
    return false;
  }
  if (peekCachedAccountLinked(playerId) !== true) {
    if (!(await isPlayerAccountLinked(playerId))) {
      return false;
    }
  }
  const pushed = await pushRemoteComposerLibrary({
    playerId,
    library: exportComposerLibrary(),
  });
  if (pushed?.library) {
    composerLibraryPullSucceeded = true;
    applyComposerLibraryFile(pushed.library);
  }
  return Boolean(pushed);
};
