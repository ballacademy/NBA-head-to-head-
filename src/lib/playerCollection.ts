import {
  ALL_STAR_COUNT,
  getAllStarPlayerIds,
  getPlayerById,
  getRecentAllStarPlayerIds,
  getSuperstarPlayersInAllStarPool,
  getWinUnlockPlayerIds,
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
  RECENT_ALL_STAR_COUNT,
  STARTING_COLLECTION_SIZE,
} from "./allStars";
import { readJson, writeJson } from "./browserStorage";
import {
  getScrubPlayerIds,
  getSuperScrubPlayerIds,
  isScrubPlayer,
  isSuperScrubPlayer,
  SCRUB_POOL_SIZE,
} from "./playerTiers";
import type { Player } from "./types";

const COLLECTION_KEY = "nba-head-to-head-player-collection";
const LAST_UNLOCK_MATCH_KEY = "nba-head-to-head-last-unlock-match";

export const PREMIUM_UNLOCK_CHANCE = 1 / 3;

export type UnlockOfferKind = "win" | "loss";

export interface UnlockOffer {
  kind: UnlockOfferKind;
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

export const createTieredUnlockPair = (
  available: string[],
  isPremium: (playerId: string) => boolean,
  premiumChance = PREMIUM_UNLOCK_CHANCE,
): [string, string] | null => {
  if (available.length === 0) {
    return null;
  }

  if (available.length === 1) {
    return [available[0]!, available[0]!];
  }

  const premium = available.filter(isPremium);
  const regular = available.filter((playerId) => !isPremium(playerId));

  if (regular.length === 0) {
    const options = shuffle(available).slice(0, 2);
    return [options[0]!, options[1]!];
  }

  if (premium.length > 0 && Math.random() < premiumChance) {
    const optionA = pickRandom(premium);
    const rest = available.filter((playerId) => playerId !== optionA);
    return [optionA, pickRandom(rest)];
  }

  const optionA = pickRandom(regular);
  const regularRest = regular.filter((playerId) => playerId !== optionA);
  const optionBPool =
    regularRest.length > 0
      ? regularRest
      : available.filter((playerId) => playerId !== optionA);

  return [optionA, pickRandom(optionBPool)];
};

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

export const isCollectibleTierPlayer = (player: Player) =>
  isAllStarPlayer(player) ||
  isRecentAllStarPlayer(player) ||
  isSuperstarPlayer(player) ||
  isScrubPlayer(player) ||
  isSuperScrubPlayer(player);

export const isRegularDraftPlayer = (player: Player) =>
  !isCollectibleTierPlayer(player);

export const getDraftablePlayers = (
  pool: Player[],
  collection: PlayerCollection,
) => {
  const unlocked = new Set(collection.unlockedIds);

  return pool.filter(
    (player) => isRegularDraftPlayer(player) || unlocked.has(player.id),
  );
};

export const isPlayerStatsMasked = (
  player: Player,
  collection = ensurePlayerCollection(),
) =>
  isCollectibleTierPlayer(player) && !collection.unlockedIds.includes(player.id);

export const createWinUnlockOffer = (
  collection = ensurePlayerCollection(),
): UnlockOffer | null => {
  const unlocked = new Set(collection.unlockedIds);
  const available = getWinUnlockPlayerIds().filter((id) => !unlocked.has(id));
  const pair = createTieredUnlockPair(available, (playerId) => {
    const player = getPlayerById(playerId);
    return Boolean(player && isSuperstarPlayer(player));
  });

  if (!pair) {
    return null;
  }

  return {
    kind: "win",
    optionA: pair[0],
    optionB: pair[1],
    createdAt: new Date().toISOString(),
  };
};

export const createLossUnlockOffer = (
  collection = ensurePlayerCollection(),
): UnlockOffer | null => {
  const unlocked = new Set(collection.unlockedIds);
  const available = getScrubPlayerIds().filter((id) => !unlocked.has(id));
  const pair = createTieredUnlockPair(available, (playerId) =>
    isSuperScrubPlayer({ id: playerId }),
  );

  if (!pair) {
    return null;
  }

  return {
    kind: "loss",
    optionA: pair[0],
    optionB: pair[1],
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

  const offer = createWinUnlockOffer(collection);

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

export const grantLossUnlock = (
  matchId: string,
  collection = ensurePlayerCollection(),
) => {
  const lastUnlock = readJson<{ matchId: string }>(LAST_UNLOCK_MATCH_KEY);

  if (lastUnlock?.matchId === matchId) {
    return collection;
  }

  const offer = createLossUnlockOffer(collection);

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

export const getCollectionProgress = (collection = ensurePlayerCollection()) => {
  const unlockedAllStars = collection.unlockedIds.filter((playerId) => {
    const player = getPlayerById(playerId);
    return Boolean(player && isAllStarPlayer(player));
  }).length;
  const unlockedRecentAllStars = collection.unlockedIds.filter((playerId) => {
    const player = getPlayerById(playerId);
    return Boolean(player && isRecentAllStarPlayer(player));
  }).length;
  const unlockedScrubs = collection.unlockedIds.filter((playerId) =>
    isScrubPlayer({ id: playerId }),
  ).length;

  return {
    unlocked: unlockedAllStars,
    total: ALL_STAR_COUNT,
    recentUnlocked: unlockedRecentAllStars,
    recentTotal: RECENT_ALL_STAR_COUNT,
    scrubPool: SCRUB_POOL_SIZE,
    superScrubPool: getSuperScrubPlayerIds().length,
    unlockedScrubs,
  };
};
