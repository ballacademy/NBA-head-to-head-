import { isAllStarPlayer, isSuperstarPlayer } from "../lib/allStars";
import type { Player } from "../lib/types";

interface PlayerRarityBadgeProps {
  player: Player;
}

export function PlayerRarityBadge({ player }: PlayerRarityBadgeProps) {
  const superstar = isSuperstarPlayer(player);
  const allStar = isAllStarPlayer(player);

  if (!allStar && !superstar) {
    return null;
  }

  return (
    <span className="player-rarity-badges">
      {allStar ? (
        <span className="player-rarity-badge player-rarity-badge--all-star">
          All-Star
        </span>
      ) : null}
      {superstar ? (
        <span className="player-rarity-badge player-rarity-badge--superstar">
          Superstar
        </span>
      ) : null}
    </span>
  );
}
