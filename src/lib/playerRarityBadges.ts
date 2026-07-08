import { isActiveStarPlayer } from "./activeStars";
import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import { isEraPlayer } from "./eraUnlocks";
import { isScrubPlayer, isSuperScrubPlayer } from "./playerTiers";
import type { Player } from "./types";

export interface PlayerRarityBadgeItem {
  key: string;
  label: string;
  compactLabel: string;
  className: string;
}

const badge = (
  key: string,
  label: string,
  compactLabel: string,
  className: string,
): PlayerRarityBadgeItem => ({
  key,
  label,
  compactLabel,
  className: `player-rarity-badge ${className}`,
});

export const getPlayerRarityBadgeItems = (
  player: Player,
  options: {
    allTimeMode?: boolean;
    includeEra?: boolean;
  } = {},
): PlayerRarityBadgeItem[] => {
  const { allTimeMode = false, includeEra = true } = options;
  const items: PlayerRarityBadgeItem[] = [];

  if (allTimeMode) {
    if (includeEra && isEraPlayer(player)) {
      items.push(badge("era", "Legend", "Legend", "player-rarity-badge--era"));
    }

    if (isActiveStarPlayer(player)) {
      items.push(
        badge(
          "active-star",
          "Active Star",
          "Active",
          "player-rarity-badge--all-star",
        ),
      );
    }

    return items;
  }

  if (includeEra && isEraPlayer(player)) {
    items.push(badge("era", "Legend", "Legend", "player-rarity-badge--era"));
  }

  if (isSuperstarPlayer(player)) {
    items.push(
      badge(
        "superstar",
        "Superstar",
        "Superstar",
        "player-rarity-badge--superstar",
      ),
    );
  } else if (isAllStarPlayer(player)) {
    items.push(
      badge("all-star", "All-Star", "All-Star", "player-rarity-badge--all-star"),
    );
  } else if (isRecentAllStarPlayer(player)) {
    items.push(
      badge(
        "recent-all-star",
        "Recent All-Star",
        "Recent AS",
        "player-rarity-badge--recent-all-star",
      ),
    );
  }

  if (isSuperScrubPlayer(player)) {
    items.push(
      badge(
        "super-scrub",
        "Super Scrub",
        "Super Scrub",
        "player-rarity-badge--super-scrub",
      ),
    );
  } else if (isScrubPlayer(player)) {
    items.push(
      badge("scrub", "Scrub", "Scrub", "player-rarity-badge--scrub"),
    );
  }

  return items;
};
