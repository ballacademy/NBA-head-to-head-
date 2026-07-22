import impactRankingData from "../../data/impact-ranking-overrides.json";
import type { Player } from "./types";

export const IMPACT_BLEND_MAX_RAW = impactRankingData.blendMaxRaw;
export const IMPACT_RANK_STAR_THRESHOLD = 30;
/** Impact ranks through this band earn lineup star-tier credit. */
export const IMPACT_RANK_ELITE_THRESHOLD = 100;

const adjustments = impactRankingData.adjustments as Record<string, number>;
const ranks = impactRankingData.ranks as Record<string, number>;

export const getPlayerImpactRank = (
  player: Pick<Player, "bbrPlayerId">,
): number | null => {
  if (!player.bbrPlayerId) {
    return null;
  }

  return ranks[player.bbrPlayerId] ?? null;
};

export const isImpactRankStarPlayer = (
  player: Pick<Player, "bbrPlayerId">,
) => {
  const rank = getPlayerImpactRank(player);
  return rank !== null && rank <= IMPACT_RANK_STAR_THRESHOLD;
};

export const isImpactRankElitePlayer = (
  player: Pick<Player, "bbrPlayerId">,
) => {
  const rank = getPlayerImpactRank(player);
  return rank !== null && rank <= IMPACT_RANK_ELITE_THRESHOLD;
};

export const getPlayerImpactAdjustment = (
  player: Pick<Player, "bbrPlayerId">,
) => {
  if (!player.bbrPlayerId) {
    return 0;
  }

  return adjustments[player.bbrPlayerId] ?? 0;
};

export const getImpactRankingAdjustment = (lineup: Player[]) =>
  lineup.reduce((total, player) => total + getPlayerImpactAdjustment(player), 0);
