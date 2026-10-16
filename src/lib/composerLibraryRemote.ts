import {
  applyComposerLibraryFile,
  exportComposerLibrary,
  mergeComposerLibraryFiles,
} from "../instagramComposer/composerLibrary";
import { isPlayerAccountLinked } from "./accountGate";
import {
  fetchRemoteComposerLibrary,
  pushRemoteComposerLibrary,
} from "./composerLibraryApi";
import { getOrCreatePlayerIdentity } from "./playerIdentity";

let composerLibraryPullSucceeded = false;

export const resetComposerLibraryPullGate = () => {
  composerLibraryPullSucceeded = false;
};

export const pullAndMergeComposerLibrary = async (
  playerId = getOrCreatePlayerIdentity().playerId,
) => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return null;
  }
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
  playerId = getOrCreatePlayerIdentity().playerId,
  options: { force?: boolean } = {},
): Promise<boolean> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return false;
  }
  if (!options.force && !composerLibraryPullSucceeded) {
    return false;
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
