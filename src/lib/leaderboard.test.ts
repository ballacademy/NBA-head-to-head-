import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatLeaderboardTeam,
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
  winStreak: 0,
  lossStreak: 0,
};

describe("leaderboard", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-test-1",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sorts by active win streak and limits to the top entries", () => {
    upsertLeaderboardEntry({
      playerId: "a",
      ...baseEntry,
      wins: 12,
      losses: 2,
      winStreak: 3,
    });
    upsertLeaderboardEntry({
      playerId: "b",
      name: "Celtics",
      wins: 8,
      losses: 4,
      winStreak: 6,
      lossStreak: 0,
    });

    expect(getTopLeaderboard("winStreak").map((entry) => entry.playerId)).toEqual([
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
      winStreak: 0,
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
      winStreak: 0,
      lossStreak: 0,
    });
    upsertLeaderboardEntry({
      playerId: "cold",
      name: "Pistons",
      wins: 8,
      losses: 12,
      winStreak: 0,
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
      winStreak: 0,
      lossStreak: 5,
    });

    expect(getTopLeaderboard("lossStreak")[0]?.playerId).toBe("b");
  });

  it("stores a public tag and formats team names with it", () => {
    upsertLeaderboardEntry({
      playerId: "hoopers-1",
      name: "hoopers",
      wins: 4,
      losses: 1,
      winStreak: 2,
      lossStreak: 0,
      publicTag: "7F3A",
    });

    const entry = getTopLeaderboard("winStreak").find(
      (candidate) => candidate.playerId === "hoopers-1",
    );

    expect(entry?.publicTag).toBe("7F3A");
    expect(formatLeaderboardTeam(entry!)).toBe("hoopers · #7F3A");
  });
});
