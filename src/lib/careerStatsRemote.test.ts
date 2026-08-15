import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyCareerStatsLocally,
  pullAndMergeCareerStats,
  pushCareerStatsIfLinked,
  resetCareerPullGate,
  snapshotLocalCareerStats,
} from "./careerStatsRemote";
import { loadAllModeRecords } from "./playerRecord";
import { loadAllTimeProfile } from "./allTimeProfile";

vi.mock("./accountGate", () => ({
  isPlayerAccountLinked: vi.fn(),
}));

vi.mock("./careerStatsApi", () => ({
  fetchRemoteCareerStats: vi.fn(),
  pushRemoteCareerStats: vi.fn(),
}));

vi.mock("./playerIdentity", () => ({
  getOrCreatePlayerIdentity: vi.fn(() => ({
    playerId: "player-1",
    publicTag: "AAAA",
  })),
  getOrCreatePlayerId: vi.fn(() => "player-1"),
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

describe("careerStatsRemote", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubStorage();
    resetCareerPullGate();
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-1",
    });
  });

  it("applies remote career records and all-time banners locally", () => {
    applyCareerStatsLocally({
      modes: {
        headToHead: {
          wins: 12,
          losses: 4,
          ties: 1,
          winStreak: 2,
          lossStreak: 0,
        },
        ranked: {
          wins: 7,
          losses: 3,
          ties: 0,
          winStreak: 1,
          lossStreak: 0,
        },
        allTime: {
          wins: 20,
          losses: 9,
          ties: 0,
          winStreak: 0,
          lossStreak: 1,
        },
      },
      allTimeBanners: { elo: 880, peakElo: 1100, gamesPlayed: 29 },
    });

    expect(loadAllModeRecords().headToHead).toMatchObject({
      wins: 12,
      losses: 4,
      ties: 1,
    });
    expect(loadAllModeRecords().ranked).toMatchObject({ wins: 7, losses: 3 });
    expect(loadAllModeRecords().allTime).toMatchObject({ wins: 20, losses: 9 });
    expect(loadAllTimeProfile()).toMatchObject({
      elo: 880,
      peakElo: 1100,
      gamesPlayed: 29,
    });
  });

  it("pulls and merges remote career stats when linked", async () => {
    const { isPlayerAccountLinked } = await import("./accountGate");
    const { fetchRemoteCareerStats, pushRemoteCareerStats } = await import(
      "./careerStatsApi"
    );

    vi.mocked(isPlayerAccountLinked).mockResolvedValue(true);
    vi.mocked(fetchRemoteCareerStats).mockResolvedValue({
      playerId: "player-1",
      career: {
        modes: {
          headToHead: {
            wins: 5,
            losses: 1,
            ties: 0,
            winStreak: 2,
            lossStreak: 0,
          },
          ranked: {
            wins: 0,
            losses: 0,
            ties: 0,
            winStreak: 0,
            lossStreak: 0,
          },
          allTime: {
            wins: 0,
            losses: 0,
            ties: 0,
            winStreak: 0,
            lossStreak: 0,
          },
        },
        allTimeBanners: { elo: 600, peakElo: 700, gamesPlayed: 4 },
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.mocked(pushRemoteCareerStats).mockResolvedValue(null);

    const merged = await pullAndMergeCareerStats("player-1");
    expect(merged?.modes.headToHead.wins).toBe(5);
    expect(loadAllModeRecords().headToHead.wins).toBe(5);
    expect(loadAllTimeProfile().peakElo).toBe(700);
  });

  it("blocks career push until a successful pull unless forced", async () => {
    const { isPlayerAccountLinked } = await import("./accountGate");
    const { pushRemoteCareerStats } = await import("./careerStatsApi");

    vi.mocked(isPlayerAccountLinked).mockResolvedValue(true);
    vi.mocked(pushRemoteCareerStats).mockResolvedValue({
      playerId: "player-1",
      career: snapshotLocalCareerStats(),
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await expect(pushCareerStatsIfLinked("player-1")).resolves.toBe(false);
    expect(pushRemoteCareerStats).not.toHaveBeenCalled();

    await expect(
      pushCareerStatsIfLinked("player-1", { force: true }),
    ).resolves.toBe(true);
    expect(pushRemoteCareerStats).toHaveBeenCalled();
  });
});
