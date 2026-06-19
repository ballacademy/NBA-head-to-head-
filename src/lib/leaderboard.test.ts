import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatLeaderboardWinPercentage,
  getTopLeaderboard,
  upsertLeaderboardEntry,
} from "./leaderboard";

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

const baseEntry = {
  name: "Bulls",
  lossStreak: 0,
};

describe("leaderboard", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sorts by wins and limits to the top entries", () => {
    upsertLeaderboardEntry({
      playerId: "a",
      ...baseEntry,
      wins: 8,
      losses: 2,
    });
    upsertLeaderboardEntry({
      playerId: "b",
      name: "Celtics",
      wins: 12,
      losses: 4,
      lossStreak: 0,
    });

    expect(getTopLeaderboard("wins").map((entry) => entry.playerId)).toEqual([
      "b",
      "a",
    ]);
  });

  it("hides win percentage until 20 games are played", () => {
    upsertLeaderboardEntry({
      playerId: "a",
      ...baseEntry,
      wins: 18,
      losses: 1,
    });

    expect(formatLeaderboardWinPercentage({ wins: 18, losses: 1 })).toBe("—");

    upsertLeaderboardEntry({
      playerId: "b",
      name: "Celtics",
      wins: 16,
      losses: 4,
      lossStreak: 0,
    });

    expect(getTopLeaderboard("winPct")[0]?.playerId).toBe("b");
    expect(formatLeaderboardWinPercentage({ wins: 16, losses: 4 })).toBe(
      "80.0%",
    );
  });

  it("sorts by lowest win percentage among qualified teams", () => {
    upsertLeaderboardEntry({
      playerId: "hot",
      name: "Heat",
      wins: 16,
      losses: 4,
      lossStreak: 0,
    });
    upsertLeaderboardEntry({
      playerId: "cold",
      name: "Pistons",
      wins: 8,
      losses: 12,
      lossStreak: 3,
    });

    expect(getTopLeaderboard("lowestWinPct")[0]?.playerId).toBe("cold");
  });

  it("sorts by active loss streak", () => {
    upsertLeaderboardEntry({
      playerId: "a",
      ...baseEntry,
      wins: 4,
      losses: 8,
      lossStreak: 2,
    });
    upsertLeaderboardEntry({
      playerId: "b",
      name: "Celtics",
      wins: 3,
      losses: 10,
      lossStreak: 5,
    });

    expect(getTopLeaderboard("lossStreak")[0]?.playerId).toBe("b");
  });
});
