import impactRankingData from "../../data/impact-ranking-overrides.json";
import type { Player } from "./types";

export const IMPACT_BLEND_MAX_RAW = impactRankingData.blendMaxRaw;
export const IMPACT_RANK_STAR_THRESHOLD = 30;
/** Impact ranks through this band earn lineup star-tier credit. */
export const IMPACT_RANK_ELITE_THRESHOLD = 100;
/** Soft mid-tier band: has elite depth but no top-50 impact anchor. */
export const IMPACT_RANK_TOP50_THRESHOLD = 50;
/** Amplify negative per-player impact blends for mid/low-tier pieces. */
export const MID_TIER_NEGATIVE_IMPACT_SCALE = 2;
export const MID_TIER_IMPACT_NO_TOP50_PENALTY = -4;
export const MID_TIER_IMPACT_NO_ELITE_PENALTY = -7;
export const MID_TIER_IMPACT_UNRANKED_PENALTY = -7;

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

export const getLineupBestImpactRank = (lineup: Player[]): number | null => {
  let best: number | null = null;

  for (const player of lineup) {
    const rank = getPlayerImpactRank(player);

    if (rank == null) {
      continue;
    }

    if (best == null || rank < best) {
      best = rank;
    }
  }

  return best;
};

/** Lineup ding when the best impact piece is only mid-tier or worse. */
export const getMidTierImpactLineupPenalty = (lineup: Player[]) => {
  if (lineup.length === 0) {
    return 0;
  }

  const best = getLineupBestImpactRank(lineup);

  if (best == null) {
    return MID_TIER_IMPACT_UNRANKED_PENALTY;
  }

  if (best <= IMPACT_RANK_TOP50_THRESHOLD) {
    return 0;
  }

  if (best <= IMPACT_RANK_ELITE_THRESHOLD) {
    return MID_TIER_IMPACT_NO_TOP50_PENALTY;
  }

  return MID_TIER_IMPACT_NO_ELITE_PENALTY;
};

export const getImpactRankingAdjustment = (lineup: Player[]) =>
  lineup.reduce((total, player) => {
    const adjustment = getPlayerImpactAdjustment(player);
    const rank = getPlayerImpactRank(player);
    const isMidOrWorse =
      rank == null || rank > IMPACT_RANK_TOP50_THRESHOLD;

    // Only stretch negative blends for mid/low-tier pieces, not top-50 anchors.
    if (adjustment < 0 && isMidOrWorse) {
      return total + adjustment * MID_TIER_NEGATIVE_IMPACT_SCALE;
    }

    return total + adjustment;
  }, 0);
