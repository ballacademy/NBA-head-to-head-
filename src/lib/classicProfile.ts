import { readJson, writeJson } from "./browserStorage";
import { getOrCreatePlayerId } from "./playerRecord";
import {
  RANKED_STARTING_ELO,
  calculateEloChange,
  getTierForElo,
  type RankedTier,
} from "./rankedElo";
import { getCurrentSeasonId } from "./rankedSeason";
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
  seasonId: string;
  elo: number;
  peakElo: number;
  classicGamesPlayed: number;
}

const createDefaultProfile = (
  playerId: string,
  seasonId: string,
): ClassicProfile => ({
  playerId,
  seasonId,
  elo: RANKED_STARTING_ELO,
  peakElo: RANKED_STARTING_ELO,
  classicGamesPlayed: 0,
});

const normalizeProfile = (
  saved: Partial<ClassicProfile> | null,
  playerId: string,
  seasonId: string,
): ClassicProfile => {
  if (
    !saved ||
    saved.playerId !== playerId ||
    saved.seasonId !== seasonId ||
    typeof saved.elo !== "number"
  ) {
    return createDefaultProfile(playerId, seasonId);
  }

  const elo = Math.max(0, Math.round(saved.elo));
  const peakElo = Math.max(elo, Math.round(saved.peakElo ?? elo));

  return {
    playerId,
    seasonId,
    elo,
    peakElo,
    classicGamesPlayed: Math.max(0, saved.classicGamesPlayed ?? 0),
  };
};

export const loadClassicProfile = (): ClassicProfile => {
  const playerId = getOrCreatePlayerId();
  const seasonId = getCurrentSeasonId();
  const saved = readJson<ClassicProfile>(CLASSIC_PROFILE_KEY);

  return normalizeProfile(saved, playerId, seasonId);
};

export const saveClassicProfile = (profile: ClassicProfile) => {
  writeJson(CLASSIC_PROFILE_KEY, profile);
};

export const ensureCurrentClassicSeason = (): ClassicProfile => {
  const profile = loadClassicProfile();
  const seasonId = getCurrentSeasonId();

  if (profile.seasonId === seasonId) {
    return profile;
  }

  const next = createDefaultProfile(profile.playerId, seasonId);
  saveClassicProfile(next);

  return next;
};

/** @deprecated Prefer ensureCurrentClassicSeason */
export const ensureClassicProfile = ensureCurrentClassicSeason;

export interface ClassicProfileView extends ClassicProfile {
  tier: RankedTier;
}

export const getClassicProfileView = (): ClassicProfileView => {
  const profile = ensureCurrentClassicSeason();

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
  const current = ensureCurrentClassicSeason();
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
