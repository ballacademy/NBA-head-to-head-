import { isPlayerAccountLinked } from "./accountGate";
import {
  fetchRemoteCareerStats,
  pushRemoteCareerStats,
} from "./careerStatsApi";
import {
  emptyCareerStats,
  mergeCareerStats,
  type CareerStatsPayload,
} from "./careerStatsShared";
import {
  loadAllTimeProfile,
  saveAllTimeProfile,
} from "./allTimeProfile";
import {
  loadAllModeRecords,
  replaceModePlayerRecords,
} from "./playerRecord";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { RANKED_STARTING_ELO } from "./rankedElo";

let careerPullSucceeded = false;

export const resetCareerPullGate = () => {
  careerPullSucceeded = false;
};

export const hasSuccessfulCareerPull = () => careerPullSucceeded;

export const snapshotLocalCareerStats = (): CareerStatsPayload => {
  const modes = loadAllModeRecords();
  const banners = loadAllTimeProfile();

  return {
    modes: {
      headToHead: {
        wins: modes.headToHead.wins,
        losses: modes.headToHead.losses,
        ties: modes.headToHead.ties,
        winStreak: modes.headToHead.winStreak,
        lossStreak: modes.headToHead.lossStreak,
      },
      ranked: {
        wins: modes.ranked.wins,
        losses: modes.ranked.losses,
        ties: modes.ranked.ties,
        winStreak: modes.ranked.winStreak,
        lossStreak: modes.ranked.lossStreak,
      },
      allTime: {
        wins: modes.allTime.wins,
        losses: modes.allTime.losses,
        ties: modes.allTime.ties,
        winStreak: modes.allTime.winStreak,
        lossStreak: modes.allTime.lossStreak,
      },
    },
    allTimeBanners: {
      elo: banners.elo,
      peakElo: banners.peakElo,
      gamesPlayed: banners.gamesPlayed,
    },
  };
};

export const applyCareerStatsLocally = (career: CareerStatsPayload) => {
  replaceModePlayerRecords({
    headToHead: career.modes.headToHead,
    ranked: career.modes.ranked,
    allTime: career.modes.allTime,
  });

  const playerId = getOrCreatePlayerIdentity().playerId;
  saveAllTimeProfile({
    playerId,
    elo: career.allTimeBanners.elo || RANKED_STARTING_ELO,
    peakElo: Math.max(
      career.allTimeBanners.peakElo,
      career.allTimeBanners.elo,
      RANKED_STARTING_ELO,
    ),
    gamesPlayed: career.allTimeBanners.gamesPlayed,
  });
};

export const pullAndMergeCareerStats = async (
  playerId = getOrCreatePlayerIdentity().playerId,
): Promise<CareerStatsPayload | null> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return null;
  }

  const remote = await fetchRemoteCareerStats(playerId);
  if (!remote) {
    return null;
  }

  careerPullSucceeded = true;
  const local = snapshotLocalCareerStats();
  const merged = mergeCareerStats(local, remote.career);
  applyCareerStatsLocally(merged);

  const localGrew =
    JSON.stringify(merged) !== JSON.stringify(remote.career);
  if (localGrew) {
    void pushRemoteCareerStats({ playerId, career: merged });
  }

  return merged;
};

export const pushCareerStatsIfLinked = async (
  playerId = getOrCreatePlayerIdentity().playerId,
  options: { force?: boolean } = {},
): Promise<boolean> => {
  if (!(await isPlayerAccountLinked(playerId))) {
    return false;
  }

  if (!options.force && !careerPullSucceeded) {
    return false;
  }

  const local = snapshotLocalCareerStats();
  const pushed = await pushRemoteCareerStats({ playerId, career: local });
  if (pushed) {
    careerPullSucceeded = true;
    applyCareerStatsLocally(pushed.career);
  }
  return Boolean(pushed);
};

export { emptyCareerStats, mergeCareerStats };
