import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mergeUnlockedAchievementIds,
  pullAndMergeAchievements,
  pushAchievementsIfLinked,
} from "./achievementsRemote";

vi.mock("./accountGate", () => ({
  isPlayerAccountLinked: vi.fn(),
}));

vi.mock("./achievementsApi", () => ({
  fetchRemoteAchievements: vi.fn(),
  pushRemoteAchievements: vi.fn(),
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

describe("achievementsRemote", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubStorage();
  });

  it("merges achievement ids from multiple lists", () => {
    expect(
      mergeUnlockedAchievementIds(
        ["nepotism", "bogus"],
        ["nepotism", "founding-gm"],
      ),
    ).toEqual(["nepotism", "founding-gm"]);
  });

  it("pulls remote unlocks into local state when linked", async () => {
    const { isPlayerAccountLinked } = await import("./accountGate");
    const { fetchRemoteAchievements, pushRemoteAchievements } = await import(
      "./achievementsApi"
    );
    const { saveAchievementState, loadAchievementState } = await import(
      "./achievements"
    );

    vi.mocked(isPlayerAccountLinked).mockResolvedValue(true);
    vi.mocked(fetchRemoteAchievements).mockResolvedValue({
      playerId: "player-1",
      unlockedIds: ["founding-gm", "seventy-wins"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.mocked(pushRemoteAchievements).mockResolvedValue(null);

    saveAchievementState({ unlocked: ["nepotism"] });

    const merged = await pullAndMergeAchievements("player-1");
    expect(merged?.unlocked).toEqual([
      "nepotism",
      "founding-gm",
      "seventy-wins",
    ]);
    expect(loadAchievementState().unlocked).toEqual([
      "nepotism",
      "founding-gm",
      "seventy-wins",
    ]);
    expect(pushRemoteAchievements).toHaveBeenCalled();
  });

  it("pushes local unlocks when linked", async () => {
    const { isPlayerAccountLinked } = await import("./accountGate");
    const { pushRemoteAchievements } = await import("./achievementsApi");
    const { saveAchievementState } = await import("./achievements");

    vi.mocked(isPlayerAccountLinked).mockResolvedValue(true);
    vi.mocked(pushRemoteAchievements).mockResolvedValue({
      playerId: "player-1",
      unlockedIds: ["nepotism"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    saveAchievementState({ unlocked: ["nepotism"] });
    await expect(pushAchievementsIfLinked()).resolves.toBe(true);
    expect(pushRemoteAchievements).toHaveBeenCalledWith({
      playerId: "player-1",
      unlockedIds: ["nepotism"],
    });
  });
});
