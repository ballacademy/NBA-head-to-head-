import { describe, expect, it } from "vitest";
import { getLossStreakTier, hasLossStreakBadge } from "./lossStreak";

describe("lossStreak", () => {
  it("returns no tier below three losses", () => {
    expect(getLossStreakTier(2)).toBeNull();
    expect(hasLossStreakBadge(2)).toBe(false);
  });

  it("escalates streak tiers at each threshold", () => {
    expect(getLossStreakTier(3)?.id).toBe("orange");
    expect(getLossStreakTier(5)?.id).toBe("red");
    expect(getLossStreakTier(10)?.id).toBe("blue");
    expect(getLossStreakTier(15)?.id).toBe("purple");
    expect(getLossStreakTier(20)?.id).toBe("black");
    expect(getLossStreakTier(25)?.id).toBe("black");
  });
});
