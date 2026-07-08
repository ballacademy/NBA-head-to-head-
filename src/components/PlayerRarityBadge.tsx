import { getPlayerRarityBadgeItems } from "../lib/playerRarityBadges";
import type { Player } from "../lib/types";

interface PlayerRarityBadgeProps {
  player: Player;
  allTimeMode?: boolean;
  compact?: boolean;
}

export function PlayerRarityBadge({
  player,
  allTimeMode = false,
  compact = false,
}: PlayerRarityBadgeProps) {
  const items = getPlayerRarityBadgeItems(player, { allTimeMode });

  if (items.length === 0) {
    return null;
  }

  return (
    <span className={`player-rarity-badges${compact ? " player-rarity-badges--compact" : ""}`}>
      {items.map((item) => (
        <span className={item.className} key={item.key}>
          {compact ? item.compactLabel : item.label}
        </span>
      ))}
    </span>
  );
}
