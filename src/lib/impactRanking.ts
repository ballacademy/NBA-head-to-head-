import impactRankingData from "../../data/impact-ranking-overrides.json";
import type { Player } from "./types";

export const IMPACT_BLEND_MAX_RAW = impactRankingData.blendMaxRaw;

const adjustments = impactRankingData.adjustments as Record<string, number>;

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
