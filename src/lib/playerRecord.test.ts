import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatPlayerRecord,
  formatWinPercentage,
  getOrCreatePlayerId,
  hasFireStreak,
  loadPlayerRecord,
  recordMatchResult,
  shouldShowWinPercentage,
  WIN_STREAK_FIRE_THRESHOLD,
} from "./playerRecord";

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

describe("playerRecord", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks wins, losses, and win streak", () => {
    recordMatchResult(true);
    recordMatchResult(true);
    const afterLoss = recordMatchResult(false);

    expect(formatPlayerRecord(afterLoss)).toBe("2-1");
    expect(afterLoss.winStreak).toBe(0);
  });

  it("shows fire streak at the configured threshold", () => {
    for (let index = 0; index < WIN_STREAK_FIRE_THRESHOLD; index += 1) {
      recordMatchResult(true);
    }

    expect(hasFireStreak(loadPlayerRecord().winStreak)).toBe(true);
  });

  it("only shows win percentage after 20 games", () => {
    const record = {
      wins: 12,
      losses: 7,
      playerId: getOrCreatePlayerId(),
      winStreak: 0,
    };

    expect(shouldShowWinPercentage(record)).toBe(false);
    expect(formatWinPercentage(record)).toBeNull();

    const qualified = {
      ...record,
      wins: 15,
      losses: 5,
    };

    expect(shouldShowWinPercentage(qualified)).toBe(true);
    expect(formatWinPercentage(qualified)).toBe("75.0%");
  });
});
