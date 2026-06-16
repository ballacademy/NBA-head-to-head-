import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_STAR_COUNT,
  getAllStarPlayerIds,
  getPlayerById,
  getRecentAllStarPlayerIds,
  getWinUnlockPlayerIds,
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
  STARTING_COLLECTION_SIZE,
} from "./allStars";
import {
  completeUnlock,
  createLossUnlockOffer,
  createStarterCollection,
  createTieredUnlockPair,
  createWinUnlockOffer,
  getDraftablePlayers,
  grantLossUnlock,
  grantWinUnlock,
  isRegularDraftPlayer,
  loadPlayerCollection,
} from "./playerCollection";
import { getScrubPlayerIds, isSuperScrubPlayer } from "./playerTiers";
import { players } from "./playerPool";

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
    expect(next.pendingUnlock?.kind).toBe("win");

    const offer = next.pendingUnlock!;
    const options = new Set([offer.optionA, offer.optionB]);

    options.forEach((playerId) => {
      expect(collection.unlockedIds).not.toContain(playerId);
      expect(getWinUnlockPlayerIds()).toContain(playerId);
    });
  });

  it("offers two locked scrubs after a loss", () => {
    const collection = loadPlayerCollection();
    const next = grantLossUnlock("match-loss-1", collection);

    expect(next.pendingUnlock).not.toBeNull();
    expect(next.pendingUnlock?.kind).toBe("loss");

    const offer = next.pendingUnlock!;
    const options = new Set([offer.optionA, offer.optionB]);

    options.forEach((playerId) => {
      expect(collection.unlockedIds).not.toContain(playerId);
      expect(getScrubPlayerIds()).toContain(playerId);
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
      pendingUnlock: createWinUnlockOffer(collection),
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

  it("keeps regular players draftable while gating collectible tiers", () => {
    const collection = loadPlayerCollection();
    const draftable = getDraftablePlayers(players, collection);
    const draftableIds = new Set(draftable.map((player) => player.id));

    expect(draftable.length).toBeGreaterThan(STARTING_COLLECTION_SIZE);

    collection.unlockedIds.forEach((playerId) => {
      expect(draftableIds.has(playerId)).toBe(true);
    });

    const lockedAllStarId = getAllStarPlayerIds().find(
      (playerId) => !collection.unlockedIds.includes(playerId),
    );

    expect(lockedAllStarId).toBeDefined();
    expect(draftableIds.has(lockedAllStarId!)).toBe(false);

    const lockedRecentAllStarId = getRecentAllStarPlayerIds().find(
      (playerId) => !collection.unlockedIds.includes(playerId),
    );

    expect(lockedRecentAllStarId).toBeDefined();
    expect(draftableIds.has(lockedRecentAllStarId!)).toBe(false);

    const regularPlayer = players.find((player) => isRegularDraftPlayer(player));

    expect(regularPlayer).toBeDefined();
    expect(draftableIds.has(regularPlayer!.id)).toBe(true);
  });

  it("only rolls premium unlocks at the configured chance", () => {
    const available = ["premium-a", "premium-b", "regular-a", "regular-b"];
    const isPremium = (id: string) => id.startsWith("premium");
    const random = vi.spyOn(Math, "random");

    random.mockReturnValueOnce(0.99);
    random.mockReturnValueOnce(0);
    random.mockReturnValueOnce(0.5);
    const regularPair = createTieredUnlockPair(available, isPremium);
    expect(regularPair?.every((id) => !isPremium(id))).toBe(true);

    random.mockReturnValueOnce(0.1);
    random.mockReturnValueOnce(0);
    random.mockReturnValueOnce(0);
    const premiumPair = createTieredUnlockPair(available, isPremium);
    expect(premiumPair?.some((id) => isPremium(id))).toBe(true);
  });

  it("can offer super scrubs when the premium roll hits on a loss offer", () => {
    const collection = loadPlayerCollection();
    const unlocked = new Set(collection.unlockedIds);
    const available = getScrubPlayerIds().filter((id) => !unlocked.has(id));
    const superScrubIds = available.filter((id) => isSuperScrubPlayer({ id }));

    if (superScrubIds.length === 0) {
      return;
    }

    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);
    const offer = createLossUnlockOffer(collection);

    expect(offer).not.toBeNull();
    expect(
      [offer!.optionA, offer!.optionB].some((id) => isSuperScrubPlayer({ id })),
    ).toBe(true);
  });
});
