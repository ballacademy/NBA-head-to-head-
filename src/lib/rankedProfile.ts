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

  return Math.max(winStreak, lossStreak);
};

const RANKED_PROFILE_KEY = "nba-head-to-head-ranked-profile";

export interface RankedProfile {
  playerId: string;
  seasonId: string;
  elo: number;
  peakElo: number;
  rankedGamesPlayed: number;
}

const createDefaultProfile = (
  playerId: string,
  seasonId: string,
): RankedProfile => ({
  playerId,
  seasonId,
  elo: RANKED_STARTING_ELO,
  peakElo: RANKED_STARTING_ELO,
  rankedGamesPlayed: 0,
});

const normalizeProfile = (
  saved: Partial<RankedProfile> | null,
  playerId: string,
  seasonId: string,
): RankedProfile => {
  if (
    !saved ||
    saved.playerId !== playerId ||
    saved.seasonId !== seasonId ||
    typeof saved.elo !== "number"
  ) {
    return createDefaultProfile(playerId, seasonId);
  }

  const elo = Math.max(0, Math.round(saved.elo));
  const peakElo = Math.max(
    elo,
    Math.round(saved.peakElo ?? elo),
  );

  return {
    playerId,
    seasonId,
    elo,
    peakElo,
    rankedGamesPlayed: Math.max(0, saved.rankedGamesPlayed ?? 0),
  };
};

export const loadRankedProfile = (): RankedProfile => {
  const playerId = getOrCreatePlayerId();
  const seasonId = getCurrentSeasonId();
  const saved = readJson<RankedProfile>(RANKED_PROFILE_KEY);

  return normalizeProfile(saved, playerId, seasonId);
};

export const saveRankedProfile = (profile: RankedProfile) => {
  writeJson(RANKED_PROFILE_KEY, profile);
};

export const ensureCurrentRankedSeason = (): RankedProfile => {
  const profile = loadRankedProfile();
  const seasonId = getCurrentSeasonId();

  if (profile.seasonId === seasonId) {
    return profile;
  }

  const next = createDefaultProfile(profile.playerId, seasonId);
  saveRankedProfile(next);

  return next;
};

export interface RankedProfileView extends RankedProfile {
  tier: RankedTier;
}

export const getRankedProfileView = (): RankedProfileView => {
  const profile = ensureCurrentRankedSeason();

  return {
    ...profile,
    tier: getTierForElo(profile.elo),
  };
};

export interface ApplyRankedMatchInput {
  result: HeadToHeadResult;
  opponentElo: number;
  winStreak: number;
  lossStreak: number;
}

export interface ApplyRankedMatchResult {
  profile: RankedProfileView;
  delta: number;
  opponentElo: number;
}

export const applyRankedMatchResult = ({
  result,
  opponentElo,
  winStreak,
  lossStreak,
}: ApplyRankedMatchInput): ApplyRankedMatchResult => {
  const current = ensureCurrentRankedSeason();
  const activeStreak = getActiveStreakForElo(result, winStreak, lossStreak);
  const { delta, nextElo } = calculateEloChange({
    playerElo: current.elo,
    opponentElo,
    result,
    rankedGamesPlayed: current.rankedGamesPlayed,
    activeStreak,
  });

  const nextProfile: RankedProfile = {
    ...current,
    elo: nextElo,
    peakElo: Math.max(current.peakElo, nextElo),
    rankedGamesPlayed: current.rankedGamesPlayed + 1,
  };

  saveRankedProfile(nextProfile);

  return {
    profile: {
      ...nextProfile,
      tier: getTierForElo(nextProfile.elo),
    },
    delta,
    opponentElo,
  };
};
