import type { HeadToHeadResult } from "./playerRecord";

export const RANKED_STARTING_ELO = 500;
export const PLACEMENT_GAMES = 10;
export const BASE_K_FACTOR = 32;
export const MAX_PLACEMENT_MULTIPLIER = 2.5;
export const STREAK_BONUS_START = 3;
export const STREAK_BONUS_PER_LEVEL = 0.1;
export const MAX_STREAK_MULTIPLIER = 1.6;

export interface RankedTier {
  id: string;
  label: string;
  minElo: number;
  maxElo: number | null;
}

export const RANKED_TIERS: readonly RankedTier[] = [
  { id: "two-way", label: "Tank Commander", minElo: 0, maxElo: 499 },
  { id: "gleague", label: "G-League GM", minElo: 500, maxElo: 999 },
  { id: "nba-gm", label: "NBA GM", minElo: 1000, maxElo: 1499 },
  { id: "top-gm", label: "Top GM", minElo: 1500, maxElo: 1999 },
  { id: "generational", label: "Generational GM", minElo: 2000, maxElo: null },
] as const;

export const getTierForElo = (elo: number): RankedTier => {
  const normalized = Math.max(0, Math.round(elo));

  for (let index = RANKED_TIERS.length - 1; index >= 0; index -= 1) {
    const tier = RANKED_TIERS[index]!;

    if (normalized >= tier.minElo) {
      return tier;
    }
  }

  return RANKED_TIERS[0]!;
};

export const RATING_LABEL = "Banners";

export const LIVE_OPPONENT_ONLY_MIN_ELO = 1500;

export const requiresLiveOpponentOnly = (rating: number) =>
  Math.max(0, Math.round(rating)) >= LIVE_OPPONENT_ONLY_MIN_ELO;

export const formatRankedElo = (elo: number) => Math.max(0, Math.round(elo)).toString();

export const formatRatingPoints = (rating: number) =>
  `${formatRankedElo(rating)} ${RATING_LABEL}`;

export const formatRatingDelta = (delta: number) =>
  `${delta >= 0 ? "+" : ""}${delta} ${RATING_LABEL}`;

export const formatTierBannerRange = (tier: RankedTier) => {
  if (tier.maxElo === null) {
    return `${formatRankedElo(tier.minElo)}+ ${RATING_LABEL}`;
  }

  return `${formatRankedElo(tier.minElo)}–${formatRankedElo(tier.maxElo)} ${RATING_LABEL}`;
};

export const getPlacementMultiplier = (gamesPlayedBeforeMatch: number) => {
  if (gamesPlayedBeforeMatch >= PLACEMENT_GAMES) {
    return 1;
  }

  const remaining = PLACEMENT_GAMES - gamesPlayedBeforeMatch;

  return 1 + (remaining / PLACEMENT_GAMES) * (MAX_PLACEMENT_MULTIPLIER - 1);
};

export const getStreakMultiplier = (streak: number) => {
  if (streak < STREAK_BONUS_START) {
    return 1;
  }

  const bonusLevels = streak - (STREAK_BONUS_START - 1);

  return Math.min(
    MAX_STREAK_MULTIPLIER,
    1 + bonusLevels * STREAK_BONUS_PER_LEVEL,
  );
};

const getExpectedScore = (playerElo: number, opponentElo: number) =>
  1 / (1 + 10 ** ((opponentElo - playerElo) / 400));

export interface EloChangeResult {
  delta: number;
  nextElo: number;
  placementMultiplier: number;
  streakMultiplier: number;
}

export interface EloChangeInput {
  playerElo: number;
  opponentElo: number;
  result: HeadToHeadResult;
  rankedGamesPlayed: number;
  activeStreak: number;
}

const getActualScore = (result: HeadToHeadResult) => {
  if (result === "win") {
    return 1;
  }

  if (result === "loss") {
    return 0;
  }

  return 0.5;
};

export const calculateEloChange = ({
  playerElo,
  opponentElo,
  result,
  rankedGamesPlayed,
  activeStreak,
}: EloChangeInput): EloChangeResult => {
  const expected = getExpectedScore(playerElo, opponentElo);
  const actual = getActualScore(result);
  const placementMultiplier = getPlacementMultiplier(rankedGamesPlayed);
  const streakMultiplier = getStreakMultiplier(activeStreak);
  const kFactor = BASE_K_FACTOR * placementMultiplier * streakMultiplier;
  const delta = Math.round(kFactor * (actual - expected));
  const nextElo = Math.max(0, Math.round(playerElo + delta));

  return {
    delta,
    nextElo,
    placementMultiplier,
    streakMultiplier,
  };
};

export const pickOpponentElo = (
  playerElo: number,
  random = Math.random,
): number => {
  const spread = 40 + Math.floor(random() * 120);
  const direction = random() < 0.5 ? -1 : 1;
  const target = playerElo + direction * spread;

  return Math.max(200, Math.min(2600, Math.round(target)));
};
