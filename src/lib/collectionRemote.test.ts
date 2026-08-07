import { beforeEach, describe, expect, it, vi } from "vitest";
import { mergeUnlockedIds } from "./collectionRemote";

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

describe("collectionRemote mergeUnlockedIds", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubStorage();
  });

  it("merges collectible ids from multiple lists", async () => {
    const { getWinUnlockPlayerIds } = await import("./allStars");
    const { getScrubPlayerIds } = await import("./playerTiers");
    const [a] = getWinUnlockPlayerIds();
    const [b] = getScrubPlayerIds();

    expect(mergeUnlockedIds([a!, "nope"], [a!, b!])).toEqual([a!, b!]);
  });
});
