import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceUnlockProgress,
  createUnlockProgress,
  loadUnlockProgress,
  resetUnlockProgress,
  saveUnlockProgress,
  shouldGrantLossUnlock,
  shouldGrantWinUnlock,
  UNLOCK_CONSECUTIVE_LOSSES,
  UNLOCK_CONSECUTIVE_WINS,
  UNLOCK_EVERY_LOSSES,
  UNLOCK_EVERY_WINS,
} from "./unlockProgress";

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

describe("unlockProgress", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    resetUnlockProgress();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("grants a win unlock every three total wins", () => {
    expect(advanceUnlockProgress(true)).toBeNull();
    expect(advanceUnlockProgress(false)).toBeNull();
    expect(advanceUnlockProgress(true)).toBeNull();
    expect(advanceUnlockProgress(false)).toBeNull();
    expect(advanceUnlockProgress(true)).toBe("win");
  });

  it("grants a win unlock after two consecutive wins", () => {
    const progress = createUnlockProgress();

    expect(advanceUnlockProgress(true, progress)).toBeNull();
    expect(advanceUnlockProgress(true, loadUnlockProgress())).toBe("win");
  });

  it("grants a loss unlock every three total losses", () => {
    expect(advanceUnlockProgress(false)).toBeNull();
    expect(advanceUnlockProgress(true)).toBeNull();
    expect(advanceUnlockProgress(false)).toBeNull();
    expect(advanceUnlockProgress(true)).toBeNull();
    expect(advanceUnlockProgress(false)).toBe("loss");
  });

  it("grants a loss unlock after two consecutive losses", () => {
    expect(advanceUnlockProgress(false, createUnlockProgress())).toBeNull();
    expect(advanceUnlockProgress(false, loadUnlockProgress())).toBe("loss");
  });

  it("resets all unlock progress when an unlock is granted", () => {
    saveUnlockProgress({
      winsSinceUnlock: 2,
      lossesSinceUnlock: 2,
      winStreak: UNLOCK_CONSECUTIVE_WINS,
      lossStreak: 1,
    });

    expect(advanceUnlockProgress(true)).toBe("win");
    expect(loadUnlockProgress()).toEqual(createUnlockProgress());
    expect(advanceUnlockProgress(true, createUnlockProgress())).toBeNull();
  });

  it("evaluates unlock thresholds before advancing counters", () => {
    expect(
      shouldGrantWinUnlock(
        { winsSinceUnlock: 2, lossesSinceUnlock: 0, winStreak: 0, lossStreak: 0 },
        true,
      ),
    ).toBe(true);
    expect(
      shouldGrantWinUnlock(
        { winsSinceUnlock: 0, lossesSinceUnlock: 0, winStreak: 1, lossStreak: 0 },
        true,
      ),
    ).toBe(true);
    expect(
      shouldGrantLossUnlock(
        { winsSinceUnlock: 0, lossesSinceUnlock: 2, lossStreak: 0, winStreak: 0 },
        false,
      ),
    ).toBe(true);
    expect(
      shouldGrantWinUnlock(
        { winsSinceUnlock: 0, lossesSinceUnlock: 0, winStreak: 0, lossStreak: 0 },
        true,
      ),
    ).toBe(false);
    expect(UNLOCK_EVERY_WINS).toBe(3);
    expect(UNLOCK_EVERY_LOSSES).toBe(3);
    expect(UNLOCK_CONSECUTIVE_WINS).toBe(2);
    expect(UNLOCK_CONSECUTIVE_LOSSES).toBe(2);
  });
});
