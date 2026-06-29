import { loadLeaderboardEntries, upsertLeaderboardEntry } from "./leaderboard";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { getGamesPlayed, loadPlayerRecord } from "./playerRecord";
import { RANKED_STARTING_ELO } from "./rankedElo";
import { ensureCurrentRankedSeason } from "./rankedProfile";
import { upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import type { TeamProfile } from "./teamProfile";

export const syncTeamNameToLeaderboards = (team: TeamProfile) => {
  const { playerId, publicTag } = getOrCreatePlayerIdentity();
  const classicRecord = loadPlayerRecord("headToHead");

  if (getGamesPlayed(classicRecord) > 0) {
    const existingEntry = loadLeaderboardEntries().find(
      (entry) => entry.playerId === playerId,
    );

    upsertLeaderboardEntry({
      playerId,
      name: team.name,
      publicTag,
      elo: existingEntry?.elo ?? RANKED_STARTING_ELO,
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
