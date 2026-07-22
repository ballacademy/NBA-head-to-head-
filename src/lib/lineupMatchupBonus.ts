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

export const SUPERSTAR_LINEUP_BONUS = 3.5;
export const ALL_STAR_LINEUP_BONUS = 2.0;
export const RECENT_ALL_STAR_LINEUP_BONUS = 1.0;
export const IMPACT_RANK_TOP_BONUS = 3.5;
export const IMPACT_RANK_FLOOR_BONUS = 0.35;
/** Flat talent credit for each player ranked inside the impact elite band. */
export const IMPACT_RANK_DEPTH_BONUS_PER_PLAYER = 0.55;
export const SCRUB_LINEUP_PENALTY = -1.1;
export const SUPER_SCRUB_LINEUP_PENALTY = -2;

export const getPlayerTaggedStarTierBonus = (player: Player) => {
  if (isSuperstarPlayer(player)) {
    return SUPERSTAR_LINEUP_BONUS;
  }

  if (isAllStarPlayer(player)) {
    return ALL_STAR_LINEUP_BONUS;
  }

  if (isRecentAllStarPlayer(player)) {
    return RECENT_ALL_STAR_LINEUP_BONUS;
  }

  return 0;
};

export const getPlayerImpactRankLineupBonus = (player: Player) => {
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

export const isImpactRankDepthPlayer = (player: Player) => {
  const rank = getPlayerImpactRank(player);
  return rank !== null && rank <= IMPACT_RANK_ELITE_THRESHOLD;
};

/** Rewards lineups that stack more top-100 impact players. */
export const getImpactDepthLineupBonus = (lineup: Player[]) =>
  lineup.reduce(
    (bonus, player) =>
      bonus +
      (isImpactRankDepthPlayer(player) ? IMPACT_RANK_DEPTH_BONUS_PER_PLAYER : 0),
    0,
  );

export const getPlayerLineupStarBonus = (player: Player) =>
  Math.max(
    getPlayerTaggedStarTierBonus(player),
    getPlayerImpactRankLineupBonus(player),
  );

export const getLineupStarBonus = (lineup: Player[]) =>
  lineup.reduce(
    (bonus, player) => bonus + getPlayerLineupStarBonus(player),
    0,
  );

/** Tag-based star credit only. Used for scrub pool classification. */
export const getStarTierLineupBonus = (lineup: Player[]) =>
  lineup.reduce(
    (bonus, player) => bonus + getPlayerTaggedStarTierBonus(player),
    0,
  );

/** Extra star credit from impact rank when it exceeds tag-based credit. */
export const getImpactRankLineupBonus = (lineup: Player[]) =>
  lineup.reduce(
    (bonus, player) =>
      bonus +
      Math.max(
        0,
        getPlayerImpactRankLineupBonus(player) -
          getPlayerTaggedStarTierBonus(player),
      ),
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
  getLineupStarBonus(lineup) +
  getImpactDepthLineupBonus(lineup) +
  getScrubTierLineupPenalty(lineup);
