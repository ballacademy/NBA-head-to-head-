import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import type { Player } from "./types";

export const SUPERSTAR_LINEUP_BONUS = 2;
export const ALL_STAR_LINEUP_BONUS = 1.1;
export const RECENT_ALL_STAR_LINEUP_BONUS = 0.45;

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
