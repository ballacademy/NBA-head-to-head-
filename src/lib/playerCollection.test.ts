import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_STAR_COUNT,
  getAllStarPlayerIds,
  getPlayerById,
  isAllStarPlayer,
  isSuperstarPlayer,
  STARTING_COLLECTION_SIZE,
} from "./allStars";
import {
  completeUnlock,
  createStarterCollection,
  createUnlockOffer,
  grantWinUnlock,
  loadPlayerCollection,
} from "./playerCollection";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  clear: () => {
    storage.clear();
  },
};

describe("playerCollection", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts each user with five random all-stars including a superstar", () => {
    const starters = createStarterCollection();

    expect(starters).toHaveLength(STARTING_COLLECTION_SIZE);
    expect(new Set(starters).size).toBe(STARTING_COLLECTION_SIZE);

    starters.forEach((playerId) => {
      const player = getPlayerById(playerId);

      expect(player).toBeDefined();
      expect(isAllStarPlayer(player!)).toBe(true);
    });

    const superstarCount = starters.filter((playerId) => {
      const player = getPlayerById(playerId);
      return player && isSuperstarPlayer(player);
    }).length;

    expect(superstarCount).toBe(1);
  });

  it("offers two locked all-stars after a win", () => {
    const collection = loadPlayerCollection();
    const next = grantWinUnlock("match-1", collection);

    expect(next.pendingUnlock).not.toBeNull();

    const offer = next.pendingUnlock!;
    const options = new Set([offer.optionA, offer.optionB]);

    options.forEach((playerId) => {
      expect(collection.unlockedIds).not.toContain(playerId);
      expect(getAllStarPlayerIds()).toContain(playerId);
    });
  });

  it("does not grant duplicate unlocks for the same match", () => {
    const collection = loadPlayerCollection();
    const first = grantWinUnlock("match-duplicate", collection);
    const second = grantWinUnlock("match-duplicate", first);

    expect(second.pendingUnlock).toEqual(first.pendingUnlock);
  });

  it("adds the selected player and clears the pending unlock", () => {
    const collection = loadPlayerCollection();
    const withOffer = {
      ...collection,
      pendingUnlock: createUnlockOffer(collection),
    };

    expect(withOffer.pendingUnlock).not.toBeNull();

    const selected = withOffer.pendingUnlock!.optionA;
    const next = completeUnlock(selected, withOffer);

    expect(next.unlockedIds).toContain(selected);
    expect(next.pendingUnlock).toBeNull();
    expect(next.unlockedIds.length).toBe(collection.unlockedIds.length + 1);
  });

  it("tracks progress against the full 2026 all-star pool", () => {
    const collection = loadPlayerCollection();

    expect(collection.unlockedIds.length).toBe(STARTING_COLLECTION_SIZE);
    expect(ALL_STAR_COUNT).toBeGreaterThan(STARTING_COLLECTION_SIZE);
  });
});
