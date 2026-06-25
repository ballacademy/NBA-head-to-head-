import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTopRankedLeaderboard, upsertRankedLeaderboardEntry } from "./rankedLeaderboard";
import { applyRankedMatchResult, ensureCurrentRankedSeason } from "./rankedProfile";
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

describe("ranked profile and leaderboard", () => {
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

  it("starts ranked players at 500 elo", () => {
    expect(ensureCurrentRankedSeason().elo).toBe(RANKED_STARTING_ELO);
  });

  it("updates elo after ranked matches and surfaces the player on the leaderboard", () => {
    const result = applyRankedMatchResult({
      won: true,
      opponentElo: 500,
      winStreak: 1,
      lossStreak: 0,
    });

    upsertRankedLeaderboardEntry({
      playerId: "player-test-1",
      name: "Bulls",
      elo: result.profile.elo,
      wins: 1,
      losses: 0,
      winStreak: 1,
      lossStreak: 0,
      isNpc: false,
    });

    expect(result.delta).toBeGreaterThan(0);
    expect(getTopRankedLeaderboard().some((entry) => entry.playerId === "player-test-1")).toBe(
      true,
    );
  });
});
