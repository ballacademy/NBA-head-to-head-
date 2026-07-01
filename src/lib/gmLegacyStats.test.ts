import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadGmLegacyStats,
  mergeGmLegacyStats,
  recordLocalGmLegacySnapshot,
} from "./gmLegacyStats";

const localStorageMock = (() => {
  const storage = new Map<string, string>();

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
  };
})();

describe("gmLegacyStats", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    localStorageMock.setItem(
      "nba-head-to-head-player-identity",
      JSON.stringify({ playerId: "legacy-test-player", publicTag: "ABCD" }),
    );
  });

  it("tracks peak banners and best monthly rank locally", () => {
    const first = recordLocalGmLegacySnapshot({
      elo: 1200,
      seasonId: "2026-06",
      monthlyRank: 42,
    });

    expect(first.peakElo).toBe(1200);
    expect(first.bestMonthlyRank).toBe(42);

    recordLocalGmLegacySnapshot({
      elo: 1650,
      seasonId: "2026-07",
      monthlyRank: 18,
    });

    recordLocalGmLegacySnapshot({
      elo: 1600,
      seasonId: "2026-08",
      monthlyRank: 55,
    });

    const persisted = loadGmLegacyStats();
    expect(persisted.peakElo).toBe(1650);
    expect(persisted.bestMonthlyRank).toBe(18);
    expect(persisted.peakEloSeasonId).toBe("2026-07");
  });

  it("merges remote legacy stats by taking best values", () => {
    const merged = mergeGmLegacyStats(
      {
        playerId: "player-a",
        peakElo: 1400,
        peakEloSeasonId: "2026-06",
        bestMonthlyRank: 30,
        bestMonthlyRankSeasonId: "2026-06",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        playerId: "player-a",
        peakElo: 1800,
        peakEloSeasonId: "2026-05",
        bestMonthlyRank: 12,
        bestMonthlyRankSeasonId: "2026-05",
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
    );

    expect(merged.peakElo).toBe(1800);
    expect(merged.bestMonthlyRank).toBe(12);
  });
});
