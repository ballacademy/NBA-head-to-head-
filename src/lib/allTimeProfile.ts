import { readJson, writeJson } from "./browserStorage";
import { getOrCreatePlayerId } from "./playerRecord";
import {
  RANKED_STARTING_ELO,
  calculateEloChange,
  getTierForElo,
  type RankedTier,
} from "./rankedElo";
import type { HeadToHeadResult } from "./playerRecord";

const getActiveStreakForElo = (
  result: HeadToHeadResult,
  winStreak: number,
  lossStreak: number,
) => {
  if (result === "win") {
    return winStreak;
  }

  if (result === "loss") {
    return lossStreak;
  }

  return 0;
};

/** Career All-Time banners — does not reset with the monthly Casual/Pro seasons. */
const ALL_TIME_PROFILE_KEY = "nba-head-to-head-all-time-profile";

export interface AllTimeProfile {
  playerId: string;
  elo: number;
  peakElo: number;
  gamesPlayed: number;
}

export interface AllTimeProfileView extends AllTimeProfile {
  tier: RankedTier;
}

const createDefaultProfile = (playerId: string): AllTimeProfile => ({
  playerId,
  elo: RANKED_STARTING_ELO,
  peakElo: RANKED_STARTING_ELO,
  gamesPlayed: 0,
});

const normalizeProfile = (
  saved: Partial<AllTimeProfile> | null,
  playerId: string,
): AllTimeProfile => {
  if (!saved || saved.playerId !== playerId || typeof saved.elo !== "number") {
    return createDefaultProfile(playerId);
  }

  const elo = Math.max(0, Math.round(saved.elo));
  const peakElo = Math.max(elo, Math.round(saved.peakElo ?? elo));

  return {
    playerId,
    elo,
    peakElo,
    gamesPlayed: Math.max(0, saved.gamesPlayed ?? 0),
  };
};

export const loadAllTimeProfile = (): AllTimeProfile => {
  const playerId = getOrCreatePlayerId();
  const saved = readJson<AllTimeProfile>(ALL_TIME_PROFILE_KEY);
  return normalizeProfile(saved, playerId);
};

export const saveAllTimeProfile = (profile: AllTimeProfile) => {
  writeJson(ALL_TIME_PROFILE_KEY, profile);
};

export const getAllTimeProfileView = (
  profile = loadAllTimeProfile(),
): AllTimeProfileView => ({
  ...profile,
  tier: getTierForElo(profile.elo),
});

export interface ApplyAllTimeMatchInput {
  result: HeadToHeadResult;
  opponentElo: number;
  winStreak: number;
  lossStreak: number;
}

export interface ApplyAllTimeMatchResult {
  profile: AllTimeProfileView;
  delta: number;
  opponentElo: number;
}

export const applyAllTimeMatchResult = ({
  result,
  opponentElo,
  winStreak,
  lossStreak,
}: ApplyAllTimeMatchInput): ApplyAllTimeMatchResult => {
  const current = loadAllTimeProfile();
  const activeStreak = getActiveStreakForElo(result, winStreak, lossStreak);
  const { delta, nextElo } = calculateEloChange({
    playerElo: current.elo,
    opponentElo,
    result,
    rankedGamesPlayed: current.gamesPlayed,
    activeStreak,
  });

  const nextProfile: AllTimeProfile = {
    ...current,
    elo: nextElo,
    peakElo: Math.max(current.peakElo, nextElo),
    gamesPlayed: current.gamesPlayed + 1,
  };

  saveAllTimeProfile(nextProfile);

  return {
    profile: {
      ...nextProfile,
      tier: getTierForElo(nextProfile.elo),
    },
    delta,
    opponentElo,
  };
};
