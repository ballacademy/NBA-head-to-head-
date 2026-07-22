import {
  ALL_STAR_COUNT,
  getAllStarPlayerIds,
  getPlayerById,
  getRecentAllStarPlayerIds,
  getRecentAllStarUnlockPlayerIds,
  getSuperstarPlayerIds,
  getSuperstarPlayersInAllStarPool,
  getWinUnlockPlayerIds,
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
  RECENT_ALL_STAR_COUNT,
  STARTING_COLLECTION_SIZE,
  SUPERSTAR_COUNT,
} from "./allStars";
import { readJson, writeJson } from "./browserStorage";
import { advanceUnlockProgress } from "./unlockProgress";
import {
  getScrubPlayerIds,
  getSuperScrubPlayerIds,
  isScrubPlayer,
  isSuperScrubPlayer,
  SCRUB_POOL_SIZE,
} from "./playerTiers";
import { isEraPlayer } from "./eraUnlocks";
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
  if (available.length < 2) {
    return null;
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
  const recentAllStars = getRecentAllStarUnlockPlayerIds();

  return Array.from(
    new Set([superstar.id, ...supporting, ...recentAllStars]),
  );
};

/** Ensure existing saves also receive the free Recent All-Star unlock set. */
export const withRecentAllStarsUnlocked = (
  collection: PlayerCollection,
): PlayerCollection => {
  const unlocked = new Set(collection.unlockedIds);
  let changed = false;

  for (const playerId of getRecentAllStarUnlockPlayerIds()) {
    if (!unlocked.has(playerId)) {
      unlocked.add(playerId);
      changed = true;
    }
  }

  if (!changed) {
    return collection;
  }

  return {
    ...collection,
    unlockedIds: [...unlocked],
  };
};

export const loadPlayerCollection = (): PlayerCollection => {
  const saved = readJson<Partial<PlayerCollection>>(COLLECTION_KEY);

  if (saved?.initialized && Array.isArray(saved.unlockedIds)) {
    return withRecentAllStarsUnlocked(
      sanitizePlayerCollection({
        unlockedIds: saved.unlockedIds,
        pendingUnlock: saved.pendingUnlock ?? null,
        initialized: true,
      }),
    );
  }

  const unlockedIds = createStarterCollection();

  return {
    unlockedIds,
    pendingUnlock: null,
    initialized: true,
  };
};

const isValidUnlockOffer = (offer: UnlockOffer | null | undefined) => {
  if (!offer) {
    return false;
  }

  const validIds =
    offer.kind === "win" ? getWinUnlockPlayerIds() : getScrubPlayerIds();

  return (
    validIds.includes(offer.optionA) &&
    validIds.includes(offer.optionB) &&
    typeof offer.createdAt === "string"
  );
};

export const sanitizePlayerCollection = (
  collection: PlayerCollection,
): PlayerCollection => {
  if (!isValidUnlockOffer(collection.pendingUnlock)) {
    if (collection.pendingUnlock) {
      return {
        ...collection,
        pendingUnlock: null,
      };
    }
  }

  return collection;
};

export const savePlayerCollection = (collection: PlayerCollection) => {
  writeJson(COLLECTION_KEY, collection);
};

export const ensurePlayerCollection = (): PlayerCollection => {
  const saved = readJson<Partial<PlayerCollection>>(COLLECTION_KEY);
  const collection = sanitizePlayerCollection(loadPlayerCollection());
  const previousUnlockedCount = Array.isArray(saved?.unlockedIds)
    ? saved.unlockedIds.length
    : 0;

  if (!saved) {
    savePlayerCollection(collection);
    return collection;
  }

  if (
    (saved.pendingUnlock && !collection.pendingUnlock) ||
    collection.unlockedIds.length !== previousUnlockedCount
  ) {
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
    (player) =>
      isEraPlayer(player) ||
      isRegularDraftPlayer(player) ||
      unlocked.has(player.id),
  );
};

export const MAX_OPPONENT_ALL_STAR_UNLOCK_GAP = 10;

export const countUnlockedAllStars = (collection: PlayerCollection) =>
  collection.unlockedIds.filter((playerId) => {
    const player = getPlayerById(playerId);
    return Boolean(
      player && (isAllStarPlayer(player) || isSuperstarPlayer(player)),
    );
  }).length;

export const createOpponentCollection = (
  userCollection: PlayerCollection,
): PlayerCollection => {
  const userAllStarCount = countUnlockedAllStars(userCollection);
  const pool = [
    ...new Set([...getAllStarPlayerIds(), ...getSuperstarPlayerIds()]),
  ];
  const maxCount = Math.min(
    userAllStarCount + MAX_OPPONENT_ALL_STAR_UNLOCK_GAP,
    pool.length,
  );
  const minCount = Math.min(userAllStarCount, maxCount);
  const targetCount =
    minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  const unlockedIds = Array.from(
    new Set([
      ...shuffle(pool).slice(0, targetCount),
      // Non-super recent all-stars are free for everyone; supers already sit in `pool`.
      ...getRecentAllStarPlayerIds(),
    ]),
  );

  return {
    unlockedIds,
    pendingUnlock: null,
    initialized: true,
  };
};

export const isPlayerStatsMasked = (
  player: Player,
  collection = ensurePlayerCollection(),
) =>
  isCollectibleTierPlayer(player) && !collection.unlockedIds.includes(player.id);

export const getUnlockedPlayerClassLabel = (player: Player): string => {
  if (isSuperstarPlayer(player)) {
    return "Superstar";
  }

  if (isAllStarPlayer(player)) {
    return "All-Star";
  }

  if (isRecentAllStarPlayer(player)) {
    return "Recent All-Star";
  }

  if (isSuperScrubPlayer(player)) {
    return "Super Scrub";
  }

  if (isScrubPlayer(player)) {
    return "Scrub";
  }

  return "n/a";
};

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
    return loadPlayerCollection();
  }

  const unlockKind = advanceUnlockProgress(true);

  if (unlockKind !== "win") {
    writeJson(LAST_UNLOCK_MATCH_KEY, { matchId });
    return collection;
  }

  const offer = createWinUnlockOffer(collection);

  writeJson(LAST_UNLOCK_MATCH_KEY, { matchId });

  if (!offer) {
    const next = {
      ...collection,
      pendingUnlock: null,
    };
    savePlayerCollection(next);
    return next;
  }

  const next = {
    ...collection,
    pendingUnlock: offer,
  };

  savePlayerCollection(next);

  return next;
};

export const grantLossUnlock = (
  matchId: string,
  collection = ensurePlayerCollection(),
) => {
  const lastUnlock = readJson<{ matchId: string }>(LAST_UNLOCK_MATCH_KEY);

  if (lastUnlock?.matchId === matchId) {
    return loadPlayerCollection();
  }

  const unlockKind = advanceUnlockProgress(false);

  if (unlockKind !== "loss") {
    writeJson(LAST_UNLOCK_MATCH_KEY, { matchId });
    return collection;
  }

  const offer = createLossUnlockOffer(collection);

  if (!offer) {
    writeJson(LAST_UNLOCK_MATCH_KEY, { matchId });
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

export const processMatchUnlock = (
  result: import("./playerRecord").HeadToHeadResult,
  matchId: string,
  collection = ensurePlayerCollection(),
) => {
  if (result === "tie") {
    writeJson(LAST_UNLOCK_MATCH_KEY, { matchId });
    return collection;
  }

  return result === "win"
    ? grantWinUnlock(matchId, collection)
    : grantLossUnlock(matchId, collection);
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

  const isValidSelection =
    offer.kind === "win"
      ? getWinUnlockPlayerIds().includes(playerId)
      : getScrubPlayerIds().includes(playerId);

  if (!isValidSelection) {
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

export type CollectionTier =
  | "all-star"
  | "superstar"
  | "recent-all-star"
  | "scrub"
  | "super-scrub";

export const COLLECTION_TIER_LABELS: Record<CollectionTier, string> = {
  "all-star": "All-Stars",
  superstar: "Superstars",
  "recent-all-star": "Recent All-Stars",
  scrub: "Scrubs",
  "super-scrub": "Super Scrubs",
};

const playerMatchesCollectionTier = (
  player: Player | undefined,
  tier: CollectionTier,
) => {
  if (!player) {
    return false;
  }

  switch (tier) {
    case "all-star":
      return isAllStarPlayer(player);
    case "superstar":
      return isSuperstarPlayer(player);
    case "recent-all-star":
      return isRecentAllStarPlayer(player);
    case "scrub":
      // Collection browse only: super scrubs live in their own tier.
      return isScrubPlayer(player) && !isSuperScrubPlayer(player);
    case "super-scrub":
      return isSuperScrubPlayer(player);
    default:
      return false;
  }
};

export const getUnlockedPlayersByTier = (
  tier: CollectionTier,
  collection = ensurePlayerCollection(),
): Player[] =>
  collection.unlockedIds
    .map((playerId) => getPlayerById(playerId))
    .filter((player): player is Player =>
      playerMatchesCollectionTier(player, tier),
    )
    .sort((left, right) => left.name.localeCompare(right.name));

export const getCollectionProgress = (collection = ensurePlayerCollection()) => {
  const unlockedAllStars = collection.unlockedIds.filter((playerId) => {
    const player = getPlayerById(playerId);
    return Boolean(player && isAllStarPlayer(player));
  }).length;
  const unlockedRecentAllStars = collection.unlockedIds.filter((playerId) => {
    const player = getPlayerById(playerId);
    return Boolean(player && isRecentAllStarPlayer(player));
  }).length;
  const unlockedSuperScrubs = collection.unlockedIds.filter((playerId) =>
    isSuperScrubPlayer({ id: playerId }),
  ).length;
  const unlockedScrubs = collection.unlockedIds.filter(
    (playerId) =>
      isScrubPlayer({ id: playerId }) && !isSuperScrubPlayer({ id: playerId }),
  ).length;
  const unlockedSuperstars = collection.unlockedIds.filter((playerId) => {
    const player = getPlayerById(playerId);
    return Boolean(player && isSuperstarPlayer(player));
  }).length;

  const winUnlockIds = new Set(getWinUnlockPlayerIds());
  const starsUnlocked = collection.unlockedIds.filter((playerId) =>
    winUnlockIds.has(playerId),
  ).length;

  return {
    unlocked: unlockedAllStars,
    total: ALL_STAR_COUNT,
    recentUnlocked: unlockedRecentAllStars,
    recentTotal: RECENT_ALL_STAR_COUNT,
    superstarUnlocked: unlockedSuperstars,
    superstarTotal: SUPERSTAR_COUNT,
    starsUnlocked,
    starPool: winUnlockIds.size,
    // Scrubs collection excludes super scrubs (same split as All-Stars vs Superstars).
    scrubPool: SCRUB_POOL_SIZE - getSuperScrubPlayerIds().length,
    superScrubPool: getSuperScrubPlayerIds().length,
    unlockedScrubs,
    unlockedSuperScrubs,
  };
};

export const getCollectionTierTotal = (
  tier: CollectionTier,
  progress = getCollectionProgress(),
) => {
  switch (tier) {
    case "all-star":
      return progress.total;
    case "superstar":
      return progress.superstarTotal;
    case "recent-all-star":
      return progress.recentTotal;
    case "scrub":
      return progress.scrubPool;
    case "super-scrub":
      return progress.superScrubPool;
    default:
      return 0;
  }
};
