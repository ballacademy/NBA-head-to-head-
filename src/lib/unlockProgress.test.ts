import { describe, expect, it } from "vitest";
import {
  advanceUnlockProgress,
  createUnlockProgress,
  shouldGrantLossUnlock,
  shouldGrantWinUnlock,
  UNLOCK_CONSECUTIVE_LOSSES,
  UNLOCK_CONSECUTIVE_WINS,
  UNLOCK_EVERY_LOSSES,
  UNLOCK_EVERY_WINS,
} from "./unlockProgress";

describe("unlockProgress", () => {
  it("grants a win unlock every three total wins", () => {
    let progress = createUnlockProgress();

    expect(advanceUnlockProgress(true, { winStreak: 1, lossStreak: 0 }, progress)).toBeNull();
    progress = { winsSinceUnlock: 1, lossesSinceUnlock: 0 };
    expect(advanceUnlockProgress(true, { winStreak: 1, lossStreak: 0 }, progress)).toBeNull();
    progress = { winsSinceUnlock: 2, lossesSinceUnlock: 0 };
    expect(advanceUnlockProgress(true, { winStreak: 1, lossStreak: 0 }, progress)).toBe("win");
  });

  it("grants a win unlock after two consecutive wins", () => {
    const progress = createUnlockProgress();

    expect(advanceUnlockProgress(true, { winStreak: 1, lossStreak: 0 }, progress)).toBeNull();
    expect(
      advanceUnlockProgress(
        true,
        { winStreak: UNLOCK_CONSECUTIVE_WINS, lossStreak: 0 },
        { winsSinceUnlock: 1, lossesSinceUnlock: 0 },
      ),
    ).toBe("win");
  });

  it("grants a loss unlock every three total losses", () => {
    let progress = createUnlockProgress();

    expect(advanceUnlockProgress(false, { winStreak: 0, lossStreak: 1 }, progress)).toBeNull();
    progress = { winsSinceUnlock: 0, lossesSinceUnlock: 1 };
    expect(advanceUnlockProgress(false, { winStreak: 0, lossStreak: 1 }, progress)).toBeNull();
    progress = { winsSinceUnlock: 0, lossesSinceUnlock: 2 };
    expect(advanceUnlockProgress(false, { winStreak: 0, lossStreak: 1 }, progress)).toBe("loss");
  });

  it("grants a loss unlock after two consecutive losses", () => {
    expect(
      advanceUnlockProgress(
        false,
        { winStreak: 0, lossStreak: UNLOCK_CONSECUTIVE_LOSSES },
        { winsSinceUnlock: 0, lossesSinceUnlock: 1 },
      ),
    ).toBe("loss");
  });

  it("resets both win and loss progress when an unlock is granted", () => {
    advanceUnlockProgress(
      true,
      { winStreak: UNLOCK_CONSECUTIVE_WINS, lossStreak: 0 },
      { winsSinceUnlock: 2, lossesSinceUnlock: 2 },
    );

    expect(
      advanceUnlockProgress(true, { winStreak: 1, lossStreak: 0 }, createUnlockProgress()),
    ).toBeNull();
  });

  it("evaluates unlock thresholds before advancing counters", () => {
    expect(shouldGrantWinUnlock({ winsSinceUnlock: 2, lossesSinceUnlock: 0 }, { winStreak: 1 })).toBe(
      true,
    );
    expect(
      shouldGrantLossUnlock({ winsSinceUnlock: 0, lossesSinceUnlock: 2 }, { lossStreak: 1 }),
    ).toBe(true);
    expect(shouldGrantWinUnlock({ winsSinceUnlock: 0, lossesSinceUnlock: 0 }, { winStreak: 1 })).toBe(
      false,
    );
    expect(UNLOCK_EVERY_WINS).toBe(3);
    expect(UNLOCK_EVERY_LOSSES).toBe(3);
  });
});
