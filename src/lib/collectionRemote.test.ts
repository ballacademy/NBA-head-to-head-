import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mergeUnlockedIds,
  pullAndMergeCollection,
  pushCollectionIfLinked,
  resetCollectionPullGate,
} from "./collectionRemote";

vi.mock("./accountGate", () => ({
  isPlayerAccountLinked: vi.fn(),
}));

vi.mock("./collectionApi", () => ({
  fetchRemoteCollection: vi.fn(),
  pushRemoteCollection: vi.fn(),
}));

vi.mock("./playerIdentity", () => ({
  getOrCreatePlayerIdentity: vi.fn(() => ({
    playerId: "player-1",
    publicTag: "AAAA",
  })),
}));

const stubStorage = () => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
  return storage;
};

describe("collectionRemote", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubStorage();
    resetCollectionPullGate();
  });

  it("merges collectible ids from multiple lists", async () => {
    const { getWinUnlockPlayerIds } = await import("./allStars");
    const { getScrubPlayerIds } = await import("./playerTiers");
    const [a] = getWinUnlockPlayerIds();
    const [b] = getScrubPlayerIds();

    expect(mergeUnlockedIds([a!, "nope"], [a!, b!])).toEqual([a!, b!]);
  });

  it("blocks collection push until a successful pull unless forced", async () => {
    const { isPlayerAccountLinked } = await import("./accountGate");
    const { pushRemoteCollection, fetchRemoteCollection } = await import(
      "./collectionApi"
    );
    const { getWinUnlockPlayerIds } = await import("./allStars");
    const [a] = getWinUnlockPlayerIds();

    vi.mocked(isPlayerAccountLinked).mockResolvedValue(true);
    vi.mocked(pushRemoteCollection).mockResolvedValue({
      playerId: "player-1",
      unlockedIds: [a!],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await expect(pushCollectionIfLinked()).resolves.toBe(false);
    expect(pushRemoteCollection).not.toHaveBeenCalled();

    vi.mocked(fetchRemoteCollection).mockResolvedValue({
      playerId: "player-1",
      unlockedIds: [a!],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await pullAndMergeCollection("player-1");
    await expect(pushCollectionIfLinked()).resolves.toBe(true);
  });
});
