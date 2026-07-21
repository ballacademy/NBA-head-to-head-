import allStarData from "../../data/all-stars-2026.json";
import recentAllStarData from "../../data/all-stars-recent.json";
import { players, playersById } from "./playerPool";
import type { Player } from "./types";

const superstarBbrIds = new Set(allStarData.superstarBbrPlayerIds);
const allStarBbrIds = new Set(allStarData.bbrPlayerIds);
const recentAllStarBbrIds = new Set(recentAllStarData.bbrPlayerIds);

export const isSuperstarPlayer = (player: Pick<Player, "bbrPlayerId">) =>
  Boolean(player.bbrPlayerId && superstarBbrIds.has(player.bbrPlayerId));

/** 2026 All-Stars who are not also classified as superstars. */
const allStarPlayers = players.filter(
  (player) =>
    player.bbrPlayerId &&
    allStarBbrIds.has(player.bbrPlayerId) &&
    !superstarBbrIds.has(player.bbrPlayerId),
);

/**
 * Players granted with the free Recent All-Star unlock set.
 * Includes superstars who only appear on the recent list (e.g. Tatum),
 * but not anyone on the current All-Star roster.
 */
const recentAllStarUnlockPlayers = players.filter(
  (player) =>
    player.bbrPlayerId &&
    recentAllStarBbrIds.has(player.bbrPlayerId) &&
    !allStarBbrIds.has(player.bbrPlayerId),
);

/** Recent All-Stars for collection/display — superstars are excluded. */
const recentAllStarPlayers = recentAllStarUnlockPlayers.filter(
  (player) => !isSuperstarPlayer(player),
);

const superstarPlayers = players.filter(isSuperstarPlayer);

const allStarIds = new Set(allStarPlayers.map((player) => player.id));
const recentAllStarIds = new Set(recentAllStarPlayers.map((player) => player.id));
const recentAllStarUnlockIds = new Set(
  recentAllStarUnlockPlayers.map((player) => player.id),
);
const superstarIds = new Set(superstarPlayers.map((player) => player.id));

export const ALL_STAR_COUNT = allStarPlayers.length;
export const RECENT_ALL_STAR_COUNT = recentAllStarPlayers.length;
export const SUPERSTAR_COUNT = superstarPlayers.length;
export const STARTING_COLLECTION_SIZE = 5;

export const isAllStarPlayer = (player: Pick<Player, "id" | "bbrPlayerId">) =>
  allStarIds.has(player.id);

export const isRecentAllStarPlayer = (player: Pick<Player, "id" | "bbrPlayerId">) =>
  recentAllStarIds.has(player.id);

export const getAllStarPlayers = () => [...allStarPlayers];

export const getRecentAllStarPlayers = () => [...recentAllStarPlayers];

export const getAllStarPlayerIds = () => [...allStarIds];

export const getRecentAllStarPlayerIds = () => [...recentAllStarIds];

/** IDs auto-unlocked with the Recent All-Star grant (may include superstars). */
export const getRecentAllStarUnlockPlayerIds = () => [...recentAllStarUnlockIds];

export const getSuperstarPlayerIds = () => [...superstarIds];

export const getWinUnlockPlayerIds = () => [
  ...new Set([
    ...allStarIds,
    ...recentAllStarUnlockIds,
    ...superstarIds,
  ]),
];

/** Superstars who also appear on the current All-Star roster (starter pick pool). */
export const getSuperstarPlayersInAllStarPool = () =>
  players.filter(
    (player) =>
      Boolean(player.bbrPlayerId) &&
      superstarBbrIds.has(player.bbrPlayerId!) &&
      allStarBbrIds.has(player.bbrPlayerId!),
  );

export const getPlayerById = (playerId: string) => playersById.get(playerId);
