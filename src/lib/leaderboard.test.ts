import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatLeaderboardElo,
  formatLeaderboardTeam,
  getTopLeaderboard,
  upsertLeaderboardEntry,
} from "./leaderboard";
import { RANKED_STARTING_ELO } from "./rankedElo";

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
  elo: RANKED_STARTING_ELO,
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

  it("sorts by elo and limits to the top entries", () => {
    upsertLeaderboardEntry({
      playerId: "a",
      ...baseEntry,
      wins: 12,
      losses: 2,
      elo: 620,
    });
    upsertLeaderboardEntry({
      playerId: "b",
      name: "Celtics",
      wins: 8,
      losses: 4,
      elo: 710,
      winStreak: 0,
      lossStreak: 0,
    });

    expect(getTopLeaderboard("elo").map((entry) => entry.playerId)).toEqual([
      "b",
      "a",
    ]);
  });

  it("sorts by active win streak", () => {
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
      elo: RANKED_STARTING_ELO,
      winStreak: 6,
      lossStreak: 0,
    });

    expect(getTopLeaderboard("winStreak").map((entry) => entry.playerId)).toEqual([
      "b",
      "a",
    ]);
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
      elo: RANKED_STARTING_ELO,
      winStreak: 0,
      lossStreak: 5,
    });

    expect(getTopLeaderboard("lossStreak")[0]?.playerId).toBe("b");
  });

  it("stores a public tag and formats team names with it", () => {
    upsertLeaderboardEntry({
      playerId: "hoopers-1",
      name: "hoopers",
      elo: 540,
      wins: 4,
      losses: 1,
      winStreak: 2,
      lossStreak: 0,
      publicTag: "7F3A",
    });

    const entry = getTopLeaderboard("elo").find(
      (candidate) => candidate.playerId === "hoopers-1",
    );

    expect(entry?.publicTag).toBe("7F3A");
    expect(formatLeaderboardTeam(entry!)).toBe("hoopers · #7F3A");
    expect(formatLeaderboardElo(entry!)).toBe("540");
  });
});
