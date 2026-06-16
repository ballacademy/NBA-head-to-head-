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
      city: "Chicago",
      name: "Bulls",
      wins: 8,
      losses: 2,
    });
    upsertLeaderboardEntry({
      playerId: "b",
      city: "Boston",
      name: "Celtics",
      wins: 12,
      losses: 4,
    });

    expect(getTopLeaderboard("wins").map((entry) => entry.playerId)).toEqual([
      "b",
      "a",
    ]);
  });

  it("hides win percentage until 20 games are played", () => {
    upsertLeaderboardEntry({
      playerId: "a",
      city: "Chicago",
      name: "Bulls",
      wins: 18,
      losses: 1,
    });

    expect(formatLeaderboardWinPercentage({ wins: 18, losses: 1 })).toBe("—");

    upsertLeaderboardEntry({
      playerId: "b",
      city: "Boston",
      name: "Celtics",
      wins: 16,
      losses: 4,
    });

    expect(getTopLeaderboard("winPct")[0]?.playerId).toBe("b");
    expect(formatLeaderboardWinPercentage({ wins: 16, losses: 4 })).toBe(
      "80.0%",
    );
  });
});
