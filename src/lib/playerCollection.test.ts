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
  createOpponentCollection,
  createLossUnlockOffer,
  createStarterCollection,
  createTieredUnlockPair,
  createWinUnlockOffer,
  getDraftablePlayers,
  getUnlockedPlayerClassLabel,
  grantLossUnlock,
  grantWinUnlock,
  isPlayerStatsMasked,
  isRegularDraftPlayer,
  loadPlayerCollection,
  sanitizePlayerCollection,
} from "./playerCollection";
import { getScrubPlayerIds, isScrubPlayer, isSuperScrubPlayer } from "./playerTiers";
import { writeJson } from "./browserStorage";
import { players } from "./playerPool";
import { resetUnlockProgress, saveUnlockProgress } from "./unlockProgress";

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
    resetUnlockProgress();
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

  it("offers two locked all-stars after a win once unlock progress is met", () => {
    const collection = loadPlayerCollection();
    saveUnlockProgress({
      winsSinceUnlock: 2,
      lossesSinceUnlock: 0,
      winStreak: 1,
      lossStreak: 0,
    });
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

  it("does not offer a win unlock before progress thresholds are met", () => {
    const collection = loadPlayerCollection();
    resetUnlockProgress();
    const next = grantWinUnlock("match-early", collection);

    expect(next.pendingUnlock).toBeNull();
  });

  it("offers two locked scrubs after a loss once unlock progress is met", () => {
    const collection = loadPlayerCollection();
    saveUnlockProgress({
      winsSinceUnlock: 0,
      lossesSinceUnlock: 2,
      winStreak: 0,
      lossStreak: 1,
    });
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
    saveUnlockProgress({
      winsSinceUnlock: 2,
      lossesSinceUnlock: 0,
      winStreak: 1,
      lossStreak: 0,
    });
    const first = grantWinUnlock("match-duplicate", collection);
    const second = grantWinUnlock("match-duplicate", {
      ...collection,
      pendingUnlock: null,
    });

    expect(second.pendingUnlock).toEqual(first.pendingUnlock);
  });

  it("clears invalid pending unlock offers on load", () => {
    const collection = loadPlayerCollection();
    const scrubId = getScrubPlayerIds()[0]!;

    writeJson("nba-head-to-head-player-collection", {
      ...collection,
      pendingUnlock: {
        kind: "win",
        optionA: scrubId,
        optionB: scrubId,
        createdAt: new Date().toISOString(),
      },
    });

    expect(sanitizePlayerCollection(loadPlayerCollection()).pendingUnlock).toBeNull();
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

  it("rejects scrub selections for win unlock offers", () => {
    const collection = loadPlayerCollection();
    const scrubId = getScrubPlayerIds()[0]!;

    const withInvalidOffer = {
      ...collection,
      pendingUnlock: {
        kind: "win" as const,
        optionA: scrubId,
        optionB: scrubId,
        createdAt: new Date().toISOString(),
      },
    };

    const next = completeUnlock(scrubId, withInvalidOffer);

    expect(next.unlockedIds).toEqual(collection.unlockedIds);
    expect(next.pendingUnlock).toEqual(withInvalidOffer.pendingUnlock);
  });

  it("clears a stale loss unlock when a win reward has no stars left", () => {
    const collection = loadPlayerCollection();
    const scrubId = getScrubPlayerIds()[0]!;
    const withLossPending = {
      ...collection,
      pendingUnlock: {
        kind: "loss" as const,
        optionA: scrubId,
        optionB: scrubId,
        createdAt: new Date().toISOString(),
      },
    };

    const allStarIds = getWinUnlockPlayerIds();
    const fullyUnlocked = {
      ...withLossPending,
      unlockedIds: [...new Set([...withLossPending.unlockedIds, ...allStarIds])],
    };

    saveUnlockProgress({
      winsSinceUnlock: 2,
      lossesSinceUnlock: 0,
      winStreak: 1,
      lossStreak: 0,
    });

    const next = grantWinUnlock("match-clear-loss", fullyUnlocked);

    expect(next.pendingUnlock).toBeNull();
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

  it("masks locked collectible players in season stats", () => {
    const collection = loadPlayerCollection();
    const lockedAllStarId = getAllStarPlayerIds().find(
      (playerId) => !collection.unlockedIds.includes(playerId),
    );
    const lockedPlayer = getPlayerById(lockedAllStarId!);
    const unlockedPlayer = getPlayerById(collection.unlockedIds[0]!);
    const regularPlayer = players.find((player) => isRegularDraftPlayer(player));

    expect(lockedPlayer).toBeDefined();
    expect(unlockedPlayer).toBeDefined();
    expect(regularPlayer).toBeDefined();
    expect(isPlayerStatsMasked(lockedPlayer!, collection)).toBe(true);
    expect(isPlayerStatsMasked(unlockedPlayer!, collection)).toBe(false);
    expect(isPlayerStatsMasked(regularPlayer!, collection)).toBe(false);
  });

  it("labels unlocked player collection classes for season stats", () => {
    const collection = loadPlayerCollection();
    const superstar = players.find((player) => isSuperstarPlayer(player));
    const scrubId = getScrubPlayerIds().find(
      (playerId) => isScrubPlayer({ id: playerId }) && !isSuperScrubPlayer({ id: playerId }),
    );
    const scrub = scrubId ? getPlayerById(scrubId) : undefined;

    expect(superstar).toBeDefined();
    expect(scrub).toBeDefined();
    expect(getUnlockedPlayerClassLabel(superstar!)).toBe("Superstar");
    expect(getUnlockedPlayerClassLabel(scrub!)).toBe("Scrub");
    expect(
      getUnlockedPlayerClassLabel(
        players.find((player) => isRegularDraftPlayer(player))!,
      ),
    ).toBe("n/a");
    expect(collection.unlockedIds.length).toBeGreaterThan(0);
  });

  it("caps opponent all-star unlocks to ten above the user", () => {
    const collection = loadPlayerCollection();
    const userAllStarCount = collection.unlockedIds.filter((playerId) => {
      const player = getPlayerById(playerId);
      return Boolean(player && isAllStarPlayer(player));
    }).length;

    for (let index = 0; index < 25; index += 1) {
      const opponent = createOpponentCollection(collection);
      const opponentAllStarCount = opponent.unlockedIds.filter((playerId) => {
        const player = getPlayerById(playerId);
        return Boolean(player && isAllStarPlayer(player));
      }).length;

      expect(opponentAllStarCount).toBeGreaterThanOrEqual(userAllStarCount);
      expect(opponentAllStarCount).toBeLessThanOrEqual(userAllStarCount + 10);
    }
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
