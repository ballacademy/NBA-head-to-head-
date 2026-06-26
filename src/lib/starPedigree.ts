import {
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
} from "./allStars";
import { isActiveStarPlayer } from "./activeStars";
import { isEraPlayer } from "./eraUnlocks";
import type { Player } from "./types";

export const hasStarPedigree = (player: Player) =>
  isEraPlayer(player) ||
  isActiveStarPlayer(player) ||
  isAllStarPlayer(player) ||
  isRecentAllStarPlayer(player) ||
  isSuperstarPlayer(player);

export const isAllStarTierPlayer = (player: Player) =>
  isEraPlayer(player) || isActiveStarPlayer(player) || isAllStarPlayer(player);

export const isSuperstarTierPlayer = (player: Player) =>
  isEraPlayer(player) || isSuperstarPlayer(player);
