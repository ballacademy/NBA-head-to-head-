import { getActiveStarPlayers } from "./activeStars";
import { getEraPlayerPool } from "./eraPlayers";
import { getUnlockedEras } from "./eraUnlocks";
import { players, playersById } from "./playerPool";
import type { PlayerRecord } from "./playerRecord";
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
  record: Pick<PlayerRecord, "wins">,
  options: PlayerPoolOptions = {},
): Player[] => {
  if (!options.allTimeMode) {
    return players;
  }

  const eraPlayers = dedupeEraPlayersByFranchise(
    getEraPlayerPool(getUnlockedEras(record)),
  );
  const activeStars = getActiveStarPlayers();
  const eraIds = new Set(eraPlayers.map((player) => player.id));
  const uniqueActiveStars = activeStars.filter((player) => !eraIds.has(player.id));

  return [...uniqueActiveStars, ...eraPlayers];
};

export const getActivePlayersById = (
  record: Pick<PlayerRecord, "wins">,
  options: PlayerPoolOptions = {},
) => {
  const pool = getActivePlayerPool(record, options);
  return new Map(pool.map((player) => [player.id, player]));
};

export const getPlayerFromActivePool = (
  playerId: string,
  record: Pick<PlayerRecord, "wins">,
  options: PlayerPoolOptions = {},
) => {
  const activeById = getActivePlayersById(record, options);
  return activeById.get(playerId) ?? playersById.get(playerId);
};

export const getPlayersByIdFromActivePool = (
  playerIds: string[],
  record: Pick<PlayerRecord, "wins">,
  options: PlayerPoolOptions = {},
) =>
  playerIds
    .map((id) => getPlayerFromActivePool(id, record, options))
    .filter((player): player is Player => Boolean(player));
