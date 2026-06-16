import allStarData from "../../data/all-stars-2026.json";
import recentAllStarData from "../../data/all-stars-recent.json";
import { players, playersById } from "./playerPool";
import type { Player } from "./types";

const superstarBbrIds = new Set(allStarData.superstarBbrPlayerIds);
const allStarBbrIds = new Set(allStarData.bbrPlayerIds);
const recentAllStarBbrIds = new Set(recentAllStarData.bbrPlayerIds);

const allStarPlayers = players.filter(
  (player) => player.bbrPlayerId && allStarBbrIds.has(player.bbrPlayerId),
);

const recentAllStarPlayers = players.filter(
  (player) =>
    player.bbrPlayerId &&
    recentAllStarBbrIds.has(player.bbrPlayerId) &&
    !allStarBbrIds.has(player.bbrPlayerId),
);

const allStarIds = new Set(allStarPlayers.map((player) => player.id));
const recentAllStarIds = new Set(recentAllStarPlayers.map((player) => player.id));

export const ALL_STAR_COUNT = allStarPlayers.length;
export const RECENT_ALL_STAR_COUNT = recentAllStarPlayers.length;
export const SUPERSTAR_COUNT = allStarData.superstarBbrPlayerIds.length;
export const STARTING_COLLECTION_SIZE = 5;

export const isSuperstarPlayer = (player: Pick<Player, "bbrPlayerId">) =>
  Boolean(player.bbrPlayerId && superstarBbrIds.has(player.bbrPlayerId));

export const isAllStarPlayer = (player: Pick<Player, "id" | "bbrPlayerId">) =>
  allStarIds.has(player.id);

export const isRecentAllStarPlayer = (player: Pick<Player, "id" | "bbrPlayerId">) =>
  recentAllStarIds.has(player.id);

export const getAllStarPlayers = () => [...allStarPlayers];

export const getRecentAllStarPlayers = () => [...recentAllStarPlayers];

export const getAllStarPlayerIds = () => [...allStarIds];

export const getRecentAllStarPlayerIds = () => [...recentAllStarIds];

export const getWinUnlockPlayerIds = () => [
  ...new Set([...allStarIds, ...recentAllStarIds]),
];

export const getSuperstarPlayersInAllStarPool = () =>
  allStarPlayers.filter(isSuperstarPlayer);

export const getPlayerById = (playerId: string) => playersById.get(playerId);
