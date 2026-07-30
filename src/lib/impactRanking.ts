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
/** Soft ding when only a single top-50 clears mid-tier without elite depth. */
export const MID_TIER_IMPACT_SOFT_CLEAR_PENALTY = -2.5;

/** Lineups with fewer than this many top-100 impact pieces pay a thin-depth tax. */
export const THIN_IMPACT_MIN_ELITE_COUNT = 2;
export const THIN_IMPACT_ONE_ELITE_PENALTY = -3.5;
export const THIN_IMPACT_ZERO_ELITE_PENALTY = -5;
/** Extra tax when offense leans on a single top-50 without a second elite piece. */
export const ONE_STAR_RELIANCE_PENALTY = -3;

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

export const isImpactRankTop50Player = (
  player: Pick<Player, "bbrPlayerId">,
) => {
  const rank = getPlayerImpactRank(player);
  return rank !== null && rank <= IMPACT_RANK_TOP50_THRESHOLD;
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

export const countImpactElitePlayers = (lineup: Player[]) =>
  lineup.filter((player) => isImpactRankElitePlayer(player)).length;

export const countImpactTop50Players = (lineup: Player[]) =>
  lineup.filter((player) => isImpactRankTop50Player(player)).length;

/**
 * Weight for team-quality blending: higher for better impact ranks.
 * Unranked players contribute a tiny share so they cannot dominate.
 */
export const getPlayerTeamQualityImpactWeight = (
  player: Pick<Player, "bbrPlayerId">,
) => {
  const rank = getPlayerImpactRank(player);

  if (rank == null) {
    return 0.05;
  }

  const capped = Math.min(rank, IMPACT_RANK_ELITE_THRESHOLD);
  return Math.max(
    0.05,
    (IMPACT_RANK_ELITE_THRESHOLD + 1 - capped) / IMPACT_RANK_ELITE_THRESHOLD,
  );
};

/**
 * Lineup ding when the best impact piece is only mid-tier or worse.
 * A lone top-50 without a second top-100 piece only soft-clears.
 */
export const getMidTierImpactLineupPenalty = (lineup: Player[]) => {
  if (lineup.length === 0) {
    return 0;
  }

  const best = getLineupBestImpactRank(lineup);
  const eliteCount = countImpactElitePlayers(lineup);

  if (best == null) {
    return MID_TIER_IMPACT_UNRANKED_PENALTY;
  }

  if (best <= IMPACT_RANK_STAR_THRESHOLD) {
    return eliteCount >= THIN_IMPACT_MIN_ELITE_COUNT
      ? 0
      : MID_TIER_IMPACT_SOFT_CLEAR_PENALTY;
  }

  if (best <= IMPACT_RANK_TOP50_THRESHOLD) {
    return eliteCount >= THIN_IMPACT_MIN_ELITE_COUNT
      ? 0
      : MID_TIER_IMPACT_SOFT_CLEAR_PENALTY;
  }

  if (best <= IMPACT_RANK_ELITE_THRESHOLD) {
    return MID_TIER_IMPACT_NO_TOP50_PENALTY;
  }

  return MID_TIER_IMPACT_NO_ELITE_PENALTY;
};

/** Tax thin impact depth and one-man top-50 reliance. */
export const getThinImpactLineupPenalty = (lineup: Player[]) => {
  if (lineup.length === 0) {
    return 0;
  }

  const eliteCount = countImpactElitePlayers(lineup);
  const top50Count = countImpactTop50Players(lineup);

  let penalty = 0;

  if (eliteCount === 0) {
    penalty += THIN_IMPACT_ZERO_ELITE_PENALTY;
  } else if (eliteCount < THIN_IMPACT_MIN_ELITE_COUNT) {
    penalty += THIN_IMPACT_ONE_ELITE_PENALTY;
  }

  if (top50Count === 1 && eliteCount < THIN_IMPACT_MIN_ELITE_COUNT) {
    penalty += ONE_STAR_RELIANCE_PENALTY;
  }

  return penalty;
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
