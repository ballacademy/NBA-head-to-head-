import { isAllStarPlayer, isRecentAllStarPlayer, isSuperstarPlayer } from "./allStars";
import type { Player } from "./types";

export const getPlayerPickShineClass = (player: Player) => {
  if (isSuperstarPlayer(player)) {
    return "player-pick--superstar";
  }

  if (isAllStarPlayer(player)) {
    return "player-pick--all-star";
  }

  if (isRecentAllStarPlayer(player)) {
    return "player-pick--recent-all-star";
  }

  return "";
};
