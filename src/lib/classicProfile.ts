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

const CLASSIC_PROFILE_KEY = "nba-head-to-head-classic-profile";

export interface ClassicProfile {
  playerId: string;
  elo: number;
  peakElo: number;
  classicGamesPlayed: number;
}

const createDefaultProfile = (playerId: string): ClassicProfile => ({
  playerId,
  elo: RANKED_STARTING_ELO,
  peakElo: RANKED_STARTING_ELO,
  classicGamesPlayed: 0,
});

const normalizeProfile = (
  saved: Partial<ClassicProfile> | null,
  playerId: string,
): ClassicProfile => {
  if (!saved || saved.playerId !== playerId || typeof saved.elo !== "number") {
    return createDefaultProfile(playerId);
  }

  const elo = Math.max(0, Math.round(saved.elo));
  const peakElo = Math.max(elo, Math.round(saved.peakElo ?? elo));

  return {
    playerId,
    elo,
    peakElo,
    classicGamesPlayed: Math.max(0, saved.classicGamesPlayed ?? 0),
  };
};

export const loadClassicProfile = (): ClassicProfile => {
  const playerId = getOrCreatePlayerId();
  const saved = readJson<ClassicProfile>(CLASSIC_PROFILE_KEY);

  return normalizeProfile(saved, playerId);
};

export const saveClassicProfile = (profile: ClassicProfile) => {
  writeJson(CLASSIC_PROFILE_KEY, profile);
};

export const ensureClassicProfile = (): ClassicProfile => {
  const profile = loadClassicProfile();
  saveClassicProfile(profile);
  return profile;
};

export interface ClassicProfileView extends ClassicProfile {
  tier: RankedTier;
}

export const getClassicProfileView = (): ClassicProfileView => {
  const profile = ensureClassicProfile();

  return {
    ...profile,
    tier: getTierForElo(profile.elo),
  };
};

export interface ApplyClassicMatchInput {
  result: HeadToHeadResult;
  opponentElo: number;
  winStreak: number;
  lossStreak: number;
}

export interface ApplyClassicMatchResult {
  profile: ClassicProfileView;
  delta: number;
  opponentElo: number;
}

export const applyClassicMatchResult = ({
  result,
  opponentElo,
  winStreak,
  lossStreak,
}: ApplyClassicMatchInput): ApplyClassicMatchResult => {
  const current = ensureClassicProfile();
  const activeStreak = getActiveStreakForElo(result, winStreak, lossStreak);
  const { delta, nextElo } = calculateEloChange({
    playerElo: current.elo,
    opponentElo,
    result,
    rankedGamesPlayed: current.classicGamesPlayed,
    activeStreak,
  });

  const nextProfile: ClassicProfile = {
    ...current,
    elo: nextElo,
    peakElo: Math.max(current.peakElo, nextElo),
    classicGamesPlayed: current.classicGamesPlayed + 1,
  };

  saveClassicProfile(nextProfile);

  return {
    profile: {
      ...nextProfile,
      tier: getTierForElo(nextProfile.elo),
    },
    delta,
    opponentElo,
  };
};
