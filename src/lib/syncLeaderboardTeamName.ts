import { upsertLeaderboardEntry } from "./leaderboard";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { getGamesPlayed, loadPlayerRecord } from "./playerRecord";
import { ensureClassicProfile } from "./classicProfile";
import { ensureCurrentRankedSeason } from "./rankedProfile";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import type { TeamProfile } from "./teamProfile";

export const syncTeamNameToLeaderboards = (team: TeamProfile) => {
  const { playerId, publicTag } = getOrCreatePlayerIdentity();
  const classicRecord = loadPlayerRecord("headToHead");

  if (getGamesPlayed(classicRecord) > 0) {
    const classicProfile = ensureClassicProfile();

    upsertLeaderboardEntry({
      playerId,
      name: team.name,
      publicTag,
      elo: classicProfile.elo,
      wins: classicRecord.wins,
      losses: classicRecord.losses,
      winStreak: classicRecord.winStreak,
      lossStreak: classicRecord.lossStreak,
    });
  }

  const rankedRecord = loadPlayerRecord("ranked");

  if (getGamesPlayed(rankedRecord) > 0) {
    const rankedProfile = ensureCurrentRankedSeason();

    upsertRankedLeaderboardEntry({
      playerId,
      name: team.name,
      publicTag,
      elo: rankedProfile.elo,
      wins: rankedRecord.wins,
      losses: rankedRecord.losses,
      winStreak: rankedRecord.winStreak,
      lossStreak: rankedRecord.lossStreak,
      isNpc: false,
    });
  }
};
