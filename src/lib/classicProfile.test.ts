import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyClassicMatchResult,
  ensureClassicProfile,
  loadClassicProfile,
} from "./classicProfile";
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

describe("classic profile", () => {
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

  it("starts classic players at 500 elo", () => {
    expect(ensureClassicProfile().elo).toBe(RANKED_STARTING_ELO);
  });

  it("updates elo after classic matches", () => {
    const result = applyClassicMatchResult({
      result: "win",
      opponentElo: 500,
      winStreak: 1,
      lossStreak: 0,
    });

    expect(result.delta).toBeGreaterThan(0);
    expect(loadClassicProfile().elo).toBeGreaterThan(RANKED_STARTING_ELO);
  });

  it("does not apply win-streak bonus on ties", () => {
    const baseProfile = {
      playerId: "player-test-1",
      elo: 500,
      peakElo: 500,
      classicGamesPlayed: 10,
    };

    storage.set(
      "nba-head-to-head-classic-profile",
      JSON.stringify(baseProfile),
    );

    const withoutStreak = applyClassicMatchResult({
      result: "tie",
      opponentElo: 700,
      winStreak: 0,
      lossStreak: 0,
    });

    storage.set(
      "nba-head-to-head-classic-profile",
      JSON.stringify(baseProfile),
    );

    const withStreak = applyClassicMatchResult({
      result: "tie",
      opponentElo: 700,
      winStreak: 5,
      lossStreak: 0,
    });

    expect(withStreak.delta).toBe(withoutStreak.delta);
  });
});
