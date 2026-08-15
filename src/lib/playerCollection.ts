import {
  ALL_STAR_COUNT,
  getAllStarPlayerIds,
  getPlayerById,
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
import {
  advanceUnlockProgress,
  loadUnlockProgress,
  saveUnlockProgress,
  UNLOCK_EVERY_LOSSES,
  UNLOCK_EVERY_WINS,
} from "./unlockProgress";
import {
  getScrubPlayerIds,
  getSuperScrubPlayerIds,
  isScrubPlayer,
  isSuperScrubPlayer,
} from "./playerTiers";
import { isEraPlayer } from "./eraUnlocks";
import { isBannedRankedEventPlayer } from "./competitivePlayerBans";
import { playersById } from "./playerPool";
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

  // Last remaining unlock — offer it as both options so the pool can finish.
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

const isValidLossUnlockOption = (playerId: string) =>
  playersById.has(playerId) && !new Set(getWinUnlockPlayerIds()).has(playerId);

const isValidUnlockOffer = (offer: UnlockOffer | null | undefined) => {
  if (!offer) {
    return false;
  }

  if (typeof offer.createdAt !== "string") {
    return false;
  }

  if (offer.kind === "win") {
    const validIds = getWinUnlockPlayerIds();
    return validIds.includes(offer.optionA) && validIds.includes(offer.optionB);
  }

  // Loss options may be former scrub-pool members after a pool rebuild.
  return (
    isValidLossUnlockOption(offer.optionA) &&
    isValidLossUnlockOption(offer.optionB)
  );
};

export const getCollectibleUnlockIdSet = () =>
  new Set([
    ...getWinUnlockPlayerIds(),
    ...getScrubPlayerIds(),
    ...getRecentAllStarUnlockPlayerIds(),
  ]);

/**
 * Keep current collectibles, and also preserve non-star unlock IDs that still
 * map to real players (e.g. former scrub-pool members after a pool rebuild).
 * Never grandfather All-Star / Superstar / Recent unlocks through this path.
 */
export const filterCollectibleUnlockedIds = (ids: string[]) => {
  const collectible = getCollectibleUnlockIdSet();
  const starUnlockIds = new Set(getWinUnlockPlayerIds());
  const next: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (!id || seen.has(id)) {
      continue;
    }

    const keep =
      collectible.has(id) ||
      (playersById.has(id) && !starUnlockIds.has(id));

    if (!keep) {
      continue;
    }

    seen.add(id);
    next.push(id);
  }

  return next;
};

export const sanitizePlayerCollection = (
  collection: PlayerCollection,
): PlayerCollection => {
  const unlockedIds = filterCollectibleUnlockedIds(collection.unlockedIds);
  const pendingUnlock = isValidUnlockOffer(collection.pendingUnlock)
    ? collection.pendingUnlock
    : null;

  if (
    unlockedIds.length === collection.unlockedIds.length &&
    pendingUnlock === collection.pendingUnlock
  ) {
    return collection;
  }

  return {
    ...collection,
    unlockedIds,
    pendingUnlock,
  };
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
      // Competitive bans (e.g. LeBron) still leave the player on the board
      // without an All-Star unlock; live Casual/Pro/Events mark him Banned.
      isBannedRankedEventPlayer(player) ||
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

/**
 * Practice bots share the user's unlock set. Competitive H2H gets a synthetic
 * collection; daily / pending / event leave collection null (other pool rules).
 */
export const resolveOpponentCollectionForMatch = (params: {
  userCollection: PlayerCollection;
  practiceMode?: boolean;
  /** Daily, pending-queue, and event matches do not use a collection filter. */
  skipCollectionFilter?: boolean;
}): PlayerCollection | null => {
  if (params.skipCollectionFilter) {
    return null;
  }

  if (params.practiceMode) {
    return params.userCollection;
  }

  return createOpponentCollection(params.userCollection);
};

export const createOpponentCollection = (
  userCollection: PlayerCollection,
): PlayerCollection => {
  const freeRecentIds = getRecentAllStarUnlockPlayerIds();
  const freeRecentSet = new Set(freeRecentIds);
  const competitivePool = [
    ...new Set([...getAllStarPlayerIds(), ...getSuperstarPlayerIds()]),
  ].filter((playerId) => !freeRecentSet.has(playerId));
  const userCompetitiveCount = userCollection.unlockedIds.filter((playerId) => {
    if (freeRecentSet.has(playerId)) {
      return false;
    }
    const player = getPlayerById(playerId);
    return Boolean(
      player && (isAllStarPlayer(player) || isSuperstarPlayer(player)),
    );
  }).length;
  const maxCount = Math.min(
    userCompetitiveCount + MAX_OPPONENT_ALL_STAR_UNLOCK_GAP,
    competitivePool.length,
  );
  const minCount = Math.min(userCompetitiveCount, maxCount);
  const targetCount =
    minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  const unlockedIds = Array.from(
    new Set([
      ...shuffle(competitivePool).slice(0, targetCount),
      // Same free Recent All-Star unlocks the user gets (incl. recent-only supers).
      ...freeRecentIds,
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
    // Keep an existing pending loss offer when the star pool is exhausted.
    return collection;
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
    // Keep an existing pending win offer when the scrub pool is exhausted.
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
      : isValidLossUnlockOption(playerId);

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

  void import("./collectionRemote")
    .then(({ pushCollectionIfLinked }) => {
      void pushCollectionIfLinked(next);
    })
    .catch(() => {
      /* Ignore offline / Vitest environment teardown. */
    });

  return next;
};

export const dismissPendingUnlock = (collection = ensurePlayerCollection()) => {
  const pending = collection.pendingUnlock;
  const next = {
    ...collection,
    pendingUnlock: null,
  };
  savePlayerCollection(next);

  // Progress was reset when the offer was granted — put the player one step
  // from re-earning so dismiss does not permanently burn the unlock cycle.
  if (pending?.kind === "win") {
    saveUnlockProgress({
      ...loadUnlockProgress(),
      winsSinceUnlock: Math.max(0, UNLOCK_EVERY_WINS - 1),
      winStreak: 0,
    });
  } else if (pending?.kind === "loss") {
    saveUnlockProgress({
      ...loadUnlockProgress(),
      lossesSinceUnlock: Math.max(0, UNLOCK_EVERY_LOSSES - 1),
      lossStreak: 0,
    });
  }

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
    scrubPool: Math.max(
      0,
      getScrubPlayerIds().length - getSuperScrubPlayerIds().length,
    ),
    superScrubPool: getSuperScrubPlayerIds().length,
    unlockedScrubs,
    unlockedSuperScrubs,
    // Whole current scrub ecosystem (regular + super).
    scrubPoolUnlocked: unlockedScrubs + unlockedSuperScrubs,
    scrubPoolTotal: getScrubPlayerIds().length,
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
