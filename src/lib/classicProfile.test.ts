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
      won: true,
      opponentElo: 500,
      winStreak: 1,
      lossStreak: 0,
    });

    expect(result.delta).toBeGreaterThan(0);
    expect(loadClassicProfile().elo).toBeGreaterThan(RANKED_STARTING_ELO);
  });
});
