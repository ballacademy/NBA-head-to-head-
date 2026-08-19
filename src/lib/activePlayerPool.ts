import { getActiveStarPlayers } from "./activeStars";
import { getEraPlayerPool } from "./eraPlayers";
import { getUnlockedEras } from "./eraUnlocks";
import { players, playersById } from "./playerPool";
import type { Player } from "./types";

export interface PlayerPoolOptions {
  allTimeMode?: boolean;
}

const dedupeEraPlayersByFranchise = (eraPlayers: Player[]) => {
  const bestByFranchise = new Map<string, Player>();

  for (const player of eraPlayers) {
    const franchiseKey = `${player.bbrPlayerId ?? player.id}:${player.team}`;
    const existing = bestByFranchise.get(franchiseKey);

    if (
      !existing ||
      player.points > existing.points ||
      (player.points === existing.points && player.minutes > existing.minutes)
    ) {
      bestByFranchise.set(franchiseKey, player);
    }
  }

  return [...bestByFranchise.values()];
};

export const getActivePlayerPool = (
  options: PlayerPoolOptions = {},
): Player[] => {
  if (!options.allTimeMode) {
    return players;
  }

  const eraPlayers = dedupeEraPlayersByFranchise(
    getEraPlayerPool(getUnlockedEras()),
  );
  const activeStars = getActiveStarPlayers();
  const eraIds = new Set(eraPlayers.map((player) => player.id));
  const uniqueActiveStars = activeStars.filter((player) => !eraIds.has(player.id));

  return [...uniqueActiveStars, ...eraPlayers];
};

export const getActivePlayersById = (options: PlayerPoolOptions = {}) => {
  const pool = getActivePlayerPool(options);
  return new Map<string, Player>(pool.map((player) => [player.id, player]));
};

const findPlayerByBbrPlayerId = (
  bbrPlayerId: string,
  pool: Iterable<Player>,
) => {
  for (const player of pool) {
    if (player.bbrPlayerId === bbrPlayerId) {
      return player;
    }
  }

  return undefined;
};

export const getPlayerFromActivePool = (
  playerId: string,
  options: PlayerPoolOptions = {},
) => {
  const pool = getActivePlayerPool(options);
  const activeById = new Map(pool.map((player) => [player.id, player]));
  const direct = activeById.get(playerId) ?? playersById.get(playerId);

  if (direct) {
    return direct;
  }

  const bbrPlayerId = playerId.split("-")[0];

  if (!bbrPlayerId) {
    return undefined;
  }

  return (
    findPlayerByBbrPlayerId(bbrPlayerId, pool) ??
    findPlayerByBbrPlayerId(bbrPlayerId, playersById.values())
  );
};

export const getPlayersByIdFromActivePool = (
  playerIds: string[],
  options: PlayerPoolOptions = {},
) =>
  playerIds
    .map((id) => getPlayerFromActivePool(id, options))
    .filter((player): player is Player => Boolean(player));

export const isCompleteLineupFromActivePool = (
  playerIds: string[],
  options: PlayerPoolOptions = {},
) => {
  const ids = playerIds.filter((id): id is string => Boolean(id));

  if (ids.length !== 5) {
    return false;
  }

  return ids.every((id) => Boolean(getPlayerFromActivePool(id, options)));
};
