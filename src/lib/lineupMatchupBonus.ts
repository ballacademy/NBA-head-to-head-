import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import type { Player } from "./types";

export const SUPERSTAR_MATCHUP_BONUS = 2;
export const ALL_STAR_MATCHUP_BONUS = 1.1;
export const RECENT_ALL_STAR_MATCHUP_BONUS = 0.45;

export const getStarTierMatchupBonus = (lineup: Player[]) =>
  lineup.reduce((bonus, player) => {
    if (isSuperstarPlayer(player)) {
      return bonus + SUPERSTAR_MATCHUP_BONUS;
    }

    if (isAllStarPlayer(player)) {
      return bonus + ALL_STAR_MATCHUP_BONUS;
    }

    if (isRecentAllStarPlayer(player)) {
      return bonus + RECENT_ALL_STAR_MATCHUP_BONUS;
    }

    return bonus;
  }, 0);

export const getMatchupEffectiveTotal = (
  lineup: Player[],
  displayTotal: number,
) => displayTotal + getStarTierMatchupBonus(lineup);
