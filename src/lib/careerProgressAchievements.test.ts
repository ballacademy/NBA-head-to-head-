import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  evaluateCareerProgressAchievements,
  unlockAchievements,
} from "./achievements";
import {
  getCareerProgressCounters,
  getEarnedCareerProgressIds,
} from "./careerProgressAchievements";
import { replaceModePlayerRecords } from "./playerRecord";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

describe("careerProgressAchievements", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "gm-current",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("earns win, play, and draft badges from existing counters", () => {
    replaceModePlayerRecords({
      headToHead: {
        wins: 50,
        losses: 50,
        ties: 0,
        winStreak: 0,
        lossStreak: 0,
      },
      ranked: {
        wins: 0,
        losses: 0,
        ties: 0,
        winStreak: 0,
        lossStreak: 0,
      },
      allTime: {
        wins: 0,
        losses: 0,
        ties: 0,
        winStreak: 0,
        lossStreak: 0,
      },
    });

    localStorage.setItem(
      "nba-head-to-head-nba-player-usage",
      JSON.stringify({
        version: 1,
        recordedKeys: Array.from({ length: 10 }, (_, index) => `k${index}`),
        byPlayerId: {},
        dailyBackfillDone: true,
        dailyLineups: {},
      }),
    );

    expect(getCareerProgressCounters()).toMatchObject({
      wins: 50,
      plays: 100,
      drafts: 10,
    });
    expect(getEarnedCareerProgressIds()).toEqual(
      expect.arrayContaining([
        "fifty-wins",
        "hundred-plays",
        "ten-drafts",
      ]),
    );

    const { newlyUnlocked } = evaluateCareerProgressAchievements();
    expect(newlyUnlocked).toEqual(
      expect.arrayContaining([
        "fifty-wins",
        "hundred-plays",
        "ten-drafts",
      ]),
    );
    expect(unlockAchievements(["fifty-wins"]).newlyUnlocked).toEqual([]);
  });
});
