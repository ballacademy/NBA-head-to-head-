import { getCachedLinkedUsername } from "./accountGate";
import { upsertLeaderboardEntry, loadLeaderboardEntries } from "./leaderboard";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { ensureClassicProfile } from "./classicProfile";
import { ensureCurrentRankedSeason } from "./rankedProfile";
import {
  upsertRankedLeaderboardEntry,
  loadRankedLeaderboardEntries,
} from "./rankedLeaderboard";
import type { TeamProfile } from "./teamProfile";

/**
 * Push the current team name onto existing monthly leaderboard rows only.
 * Do not invent season W–L from career modeRecords — that breaks remote
 * first-insert validation and collapses multi-player boards.
 * Preserve the linked account username so Ranks keeps @user beside the new name.
 */
export const syncTeamNameToLeaderboards = (team: TeamProfile) => {
  const { playerId, publicTag } = getOrCreatePlayerIdentity();
  const linkedUsername = getCachedLinkedUsername(playerId) ?? undefined;
  const classicEntry = loadLeaderboardEntries().find(
    (entry) => entry.playerId === playerId,
  );

  if (classicEntry) {
    const classicProfile = ensureClassicProfile();

    upsertLeaderboardEntry({
      playerId,
      name: team.name,
      publicTag,
      username: classicEntry.username ?? linkedUsername,
      elo: classicProfile.elo,
      wins: classicEntry.wins,
      losses: classicEntry.losses,
      winStreak: classicEntry.winStreak,
      lossStreak: classicEntry.lossStreak,
    });
  }

  const rankedEntry = loadRankedLeaderboardEntries().find(
    (entry) => entry.playerId === playerId,
  );

  if (rankedEntry) {
    const rankedProfile = ensureCurrentRankedSeason();

    upsertRankedLeaderboardEntry({
      playerId,
      name: team.name,
      publicTag,
      username: rankedEntry.username ?? linkedUsername,
      elo: rankedProfile.elo,
      wins: rankedEntry.wins,
      losses: rankedEntry.losses,
      winStreak: rankedEntry.winStreak,
      lossStreak: rankedEntry.lossStreak,
      isNpc: false,
    });
  }
};
