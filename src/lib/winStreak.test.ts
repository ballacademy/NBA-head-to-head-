import { describe, expect, it } from "vitest";
import { getWinStreakTier, hasFireStreak } from "./winStreak";

describe("winStreak", () => {
  it("returns no tier below three wins", () => {
    expect(getWinStreakTier(2)).toBeNull();
    expect(hasFireStreak(2)).toBe(false);
  });

  it("escalates streak tiers at each threshold", () => {
    expect(getWinStreakTier(3)?.id).toBe("orange");
    expect(getWinStreakTier(5)?.id).toBe("red");
    expect(getWinStreakTier(10)?.id).toBe("blue");
    expect(getWinStreakTier(15)?.id).toBe("purple");
    expect(getWinStreakTier(20)?.id).toBe("black");
    expect(getWinStreakTier(25)?.id).toBe("black");
  });
});
