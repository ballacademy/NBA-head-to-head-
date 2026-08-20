import { isPlayerAccountLinked } from "./accountGate";
import { fetchRemoteDailyDraftPlayerHistory } from "./dailyDraftApi";
import { mergeDailyDraftHistoryEntries } from "./dailyDraftScores";
import { getOrCreatePlayerIdentity } from "./playerIdentity";

/**
 * Pulls this account's Daily Draft history from the cloud so play streaks
 * survive logout and restore on another device.
 */
export const pullAndMergeDailyDraftHistory = async (
  playerId = getOrCreatePlayerIdentity().playerId,
) => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return null;
  }

  const remote = await fetchRemoteDailyDraftPlayerHistory(playerId);
  if (!remote) {
    return null;
  }

  mergeDailyDraftHistoryEntries(remote.entries);
  return remote;
};
