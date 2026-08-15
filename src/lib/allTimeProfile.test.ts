import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAllTimeMatchResult,
  loadAllTimeProfile,
  saveAllTimeProfile,
} from "./allTimeProfile";
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

describe("allTimeProfile", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "player-all-time-1",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts All-Time banners at the shared floor and keeps career peaks", () => {
    expect(loadAllTimeProfile().elo).toBe(RANKED_STARTING_ELO);

    saveAllTimeProfile({
      playerId: "player-all-time-1",
      elo: 1200,
      peakElo: 1400,
      gamesPlayed: 20,
    });

    expect(loadAllTimeProfile().peakElo).toBe(1400);
  });

  it("applies streak-aware banner changes like Casual/Pro", () => {
    const result = applyAllTimeMatchResult({
      result: "win",
      opponentElo: 500,
      winStreak: 3,
      lossStreak: 0,
    });

    expect(result.delta).toBeGreaterThan(0);
    expect(result.profile.elo).toBeGreaterThan(RANKED_STARTING_ELO);
    expect(result.profile.peakElo).toBe(result.profile.elo);
    expect(result.profile.gamesPlayed).toBe(1);
  });
});
