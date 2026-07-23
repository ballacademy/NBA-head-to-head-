import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyClassicMatchResult,
  ensureClassicProfile,
} from "./classicProfile";
import { getTopLeaderboard, upsertLeaderboardEntry } from "./leaderboard";
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

describe("classic profile and leaderboard", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-classic-1",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts classic players at 500 banners", () => {
    expect(ensureClassicProfile().elo).toBe(RANKED_STARTING_ELO);
  });

  it("updates banners after classic matches and surfaces the player on the leaderboard", () => {
    const result = applyClassicMatchResult({
      result: "win",
      opponentElo: 500,
      winStreak: 1,
      lossStreak: 0,
    });

    upsertLeaderboardEntry({
      playerId: "player-classic-1",
      name: "Bulls",
      elo: result.profile.elo,
      wins: 1,
      losses: 0,
      winStreak: 1,
      lossStreak: 0,
    });

    expect(result.delta).toBeGreaterThan(0);
    expect(result.profile.elo).not.toBe(RANKED_STARTING_ELO);
    expect(
      getTopLeaderboard("elo").some(
        (entry) => entry.playerId === "player-classic-1",
      ),
    ).toBe(true);
  });
});
