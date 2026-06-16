import { isAllStarPlayer, isSuperstarPlayer } from "../lib/allStars";
import { isScrubPlayer, isSuperScrubPlayer } from "../lib/playerTiers";
import type { Player } from "../lib/types";

interface PlayerRarityBadgeProps {
  player: Player;
}

export function PlayerRarityBadge({ player }: PlayerRarityBadgeProps) {
  const superstar = isSuperstarPlayer(player);
  const allStar = isAllStarPlayer(player);
  const superScrub = isSuperScrubPlayer(player);
  const scrub = isScrubPlayer(player);

  if (!allStar && !superstar && !scrub && !superScrub) {
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
      {scrub ? (
        <span className="player-rarity-badge player-rarity-badge--scrub">
          Scrub
        </span>
      ) : null}
      {superScrub ? (
        <span className="player-rarity-badge player-rarity-badge--super-scrub">
          Super Scrub
        </span>
      ) : null}
    </span>
  );
}
