import { getEraPlayerPool } from "./eraPlayers";
import { getUnlockedEras } from "./eraUnlocks";
import { players, playersById } from "./playerPool";
import type { PlayerRecord } from "./playerRecord";
import type { Player } from "./types";

export const getActivePlayerPool = (
  record: Pick<PlayerRecord, "wins">,
): Player[] => {
  const eraPlayers = getEraPlayerPool(getUnlockedEras(record));
  const currentIds = new Set(players.map((player) => player.id));
  const uniqueEraPlayers = eraPlayers.filter((player) => !currentIds.has(player.id));

  return [...players, ...uniqueEraPlayers];
};

export const getActivePlayersById = (record: Pick<PlayerRecord, "wins">) => {
  const pool = getActivePlayerPool(record);
  return new Map(pool.map((player) => [player.id, player]));
};

export const getPlayerFromActivePool = (
  playerId: string,
  record: Pick<PlayerRecord, "wins">,
) => {
  const activeById = getActivePlayersById(record);
  return activeById.get(playerId) ?? playersById.get(playerId);
};

export const getPlayersByIdFromActivePool = (
  playerIds: string[],
  record: Pick<PlayerRecord, "wins">,
) =>
  playerIds
    .map((id) => getPlayerFromActivePool(id, record))
    .filter((player): player is Player => Boolean(player));
