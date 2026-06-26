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
      result: "win",
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

  it("does not apply win-streak bonus on ties", () => {
    const baseProfile = {
      playerId: "player-test-1",
      seasonId: ensureCurrentRankedSeason().seasonId,
      elo: 500,
      peakElo: 500,
      rankedGamesPlayed: 10,
    };

    storage.set(
      "nba-head-to-head-ranked-profile",
      JSON.stringify(baseProfile),
    );

    const withoutStreak = applyRankedMatchResult({
      result: "tie",
      opponentElo: 700,
      winStreak: 0,
      lossStreak: 0,
    });

    storage.set(
      "nba-head-to-head-ranked-profile",
      JSON.stringify(baseProfile),
    );

    const withStreak = applyRankedMatchResult({
      result: "tie",
      opponentElo: 700,
      winStreak: 5,
      lossStreak: 0,
    });

    expect(withStreak.delta).toBe(withoutStreak.delta);
  });
});
