import {
  ALL_STAR_COUNT,
  getAllStarPlayerIds,
  getAllStarPlayers,
  getPlayerById,
  getSuperstarPlayersInAllStarPool,
  isSuperstarPlayer,
  STARTING_COLLECTION_SIZE,
} from "./allStars";
import { readJson, writeJson } from "./browserStorage";

const COLLECTION_KEY = "nba-head-to-head-player-collection";
const LAST_UNLOCK_MATCH_KEY = "nba-head-to-head-last-unlock-match";

export interface UnlockOffer {
  optionA: string;
  optionB: string;
  createdAt: string;
}

export interface PlayerCollection {
  unlockedIds: string[];
  pendingUnlock: UnlockOffer | null;
  initialized: boolean;
}

const shuffle = <T>(values: T[]) => {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const pickRandom = <T>(values: T[]) =>
  values[Math.floor(Math.random() * values.length)];

export const createStarterCollection = (): string[] => {
  const superstarPool = getSuperstarPlayersInAllStarPool();
  const superstar = pickRandom(superstarPool);
  const remainingPool = getAllStarPlayerIds().filter((id) => {
    if (id === superstar.id) {
      return false;
    }

    const player = getPlayerById(id);
    return Boolean(player && !isSuperstarPlayer(player));
  });
  const supporting = shuffle(remainingPool).slice(0, STARTING_COLLECTION_SIZE - 1);

  return shuffle([superstar.id, ...supporting]);
};

export const loadPlayerCollection = (): PlayerCollection => {
  const saved = readJson<Partial<PlayerCollection>>(COLLECTION_KEY);

  if (saved?.initialized && Array.isArray(saved.unlockedIds)) {
    return {
      unlockedIds: saved.unlockedIds,
      pendingUnlock: saved.pendingUnlock ?? null,
      initialized: true,
    };
  }

  const unlockedIds = createStarterCollection();

  return {
    unlockedIds,
    pendingUnlock: null,
    initialized: true,
  };
};

export const savePlayerCollection = (collection: PlayerCollection) => {
  writeJson(COLLECTION_KEY, collection);
};

export const ensurePlayerCollection = (): PlayerCollection => {
  const collection = loadPlayerCollection();

  if (!readJson(COLLECTION_KEY)) {
    savePlayerCollection(collection);
  }

  return collection;
};

export const getUnlockedPlayerIds = (collection = ensurePlayerCollection()) =>
  collection.unlockedIds;

export const createUnlockOffer = (
  collection = ensurePlayerCollection(),
): UnlockOffer | null => {
  const unlocked = new Set(collection.unlockedIds);
  const available = getAllStarPlayerIds().filter((id) => !unlocked.has(id));

  if (available.length === 0) {
    return null;
  }

  const options = shuffle(available).slice(0, Math.min(2, available.length));

  if (options.length === 1) {
    return {
      optionA: options[0]!,
      optionB: options[0]!,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    optionA: options[0]!,
    optionB: options[1]!,
    createdAt: new Date().toISOString(),
  };
};

export const grantWinUnlock = (
  matchId: string,
  collection = ensurePlayerCollection(),
) => {
  const lastUnlock = readJson<{ matchId: string }>(LAST_UNLOCK_MATCH_KEY);

  if (lastUnlock?.matchId === matchId) {
    return collection;
  }

  const offer = createUnlockOffer(collection);

  if (!offer) {
    return collection;
  }

  const next = {
    ...collection,
    pendingUnlock: offer,
  };

  savePlayerCollection(next);
  writeJson(LAST_UNLOCK_MATCH_KEY, { matchId });

  return next;
};

export const completeUnlock = (
  playerId: string,
  collection = ensurePlayerCollection(),
) => {
  const offer = collection.pendingUnlock;

  if (!offer) {
    return collection;
  }

  if (playerId !== offer.optionA && playerId !== offer.optionB) {
    return collection;
  }

  const unlockedIds = collection.unlockedIds.includes(playerId)
    ? collection.unlockedIds
    : [...collection.unlockedIds, playerId];

  const next = {
    ...collection,
    unlockedIds,
    pendingUnlock: null,
  };
  savePlayerCollection(next);

  return next;
};

export const dismissPendingUnlock = (collection = ensurePlayerCollection()) => {
  const next = {
    ...collection,
    pendingUnlock: null,
  };
  savePlayerCollection(next);

  return next;
};

export const getCollectionProgress = (collection = ensurePlayerCollection()) => ({
  unlocked: collection.unlockedIds.length,
  total: ALL_STAR_COUNT,
});
