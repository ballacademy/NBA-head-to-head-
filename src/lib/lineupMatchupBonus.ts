import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import {
  getPlayerImpactRank,
  IMPACT_RANK_ELITE_THRESHOLD,
} from "./impactRanking";
import { isScrubPlayer, isSuperScrubPlayer } from "./playerTiers";
import type { Player } from "./types";

export const SUPERSTAR_LINEUP_BONUS = 2.5;
export const ALL_STAR_LINEUP_BONUS = 1.4;
export const RECENT_ALL_STAR_LINEUP_BONUS = 0.45;
export const IMPACT_RANK_TOP_BONUS = 2.5;
export const IMPACT_RANK_FLOOR_BONUS = 0.2;
export const SCRUB_LINEUP_PENALTY = -1.1;
export const SUPER_SCRUB_LINEUP_PENALTY = -2;

const hasExistingStarTierBonus = (player: Player) =>
  isSuperstarPlayer(player) ||
  isAllStarPlayer(player) ||
  isRecentAllStarPlayer(player);

export const getPlayerImpactRankLineupBonus = (player: Player) => {
  if (hasExistingStarTierBonus(player)) {
    return 0;
  }

  const rank = getPlayerImpactRank(player);
  if (rank === null || rank > IMPACT_RANK_ELITE_THRESHOLD) {
    return 0;
  }

  const progress = (rank - 1) / (IMPACT_RANK_ELITE_THRESHOLD - 1);

  return (
    IMPACT_RANK_TOP_BONUS +
    (IMPACT_RANK_FLOOR_BONUS - IMPACT_RANK_TOP_BONUS) * progress
  );
};

export const getStarTierLineupBonus = (lineup: Player[]) =>
  lineup.reduce((bonus, player) => {
    if (isSuperstarPlayer(player)) {
      return bonus + SUPERSTAR_LINEUP_BONUS;
    }

    if (isAllStarPlayer(player)) {
      return bonus + ALL_STAR_LINEUP_BONUS;
    }

    if (isRecentAllStarPlayer(player)) {
      return bonus + RECENT_ALL_STAR_LINEUP_BONUS;
    }

    return bonus;
  }, 0);

export const getImpactRankLineupBonus = (lineup: Player[]) =>
  lineup.reduce(
    (bonus, player) => bonus + getPlayerImpactRankLineupBonus(player),
    0,
  );

export const getScrubTierLineupPenalty = (lineup: Player[]) =>
  lineup.reduce((penalty, player) => {
    if (isSuperScrubPlayer(player)) {
      return penalty + SUPER_SCRUB_LINEUP_PENALTY;
    }

    if (isScrubPlayer(player)) {
      return penalty + SCRUB_LINEUP_PENALTY;
    }

    return penalty;
  }, 0);

export const getLineupTierAdjustment = (lineup: Player[]) =>
  getStarTierLineupBonus(lineup) +
  getImpactRankLineupBonus(lineup) +
  getScrubTierLineupPenalty(lineup);
