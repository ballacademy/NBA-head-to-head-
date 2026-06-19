import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "../lib/allStars";
import { isScrubPlayer, isSuperScrubPlayer } from "../lib/playerTiers";
import { isEraPlayer } from "../lib/eraUnlocks";
import type { Player } from "../lib/types";

interface PlayerRarityBadgeProps {
  player: Player;
}

export function PlayerRarityBadge({ player }: PlayerRarityBadgeProps) {
  const superstar = isSuperstarPlayer(player);
  const allStar = isAllStarPlayer(player);
  const recentAllStar = isRecentAllStarPlayer(player);
  const superScrub = isSuperScrubPlayer(player);
  const scrub = isScrubPlayer(player);
  const era = isEraPlayer(player);

  if (!allStar && !recentAllStar && !superstar && !scrub && !superScrub && !era) {
    return null;
  }

  return (
    <span className="player-rarity-badges">
      {era ? (
        <span className="player-rarity-badge player-rarity-badge--era">
          Legend
        </span>
      ) : null}
      {allStar ? (
        <span className="player-rarity-badge player-rarity-badge--all-star">
          All-Star
        </span>
      ) : null}
      {recentAllStar ? (
        <span className="player-rarity-badge player-rarity-badge--recent-all-star">
          Recent All-Star
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
