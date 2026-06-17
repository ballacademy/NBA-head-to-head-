import { describe, expect, it } from "vitest";
import { FULL_SAMPLE_MIN_GAMES, hasLimitedSampleSize } from "./sampleSize";

describe("sampleSize", () => {
  it("flags players below the full-sample game threshold", () => {
    expect(hasLimitedSampleSize({ gamesPlayed: FULL_SAMPLE_MIN_GAMES - 1 })).toBe(
      true,
    );
    expect(hasLimitedSampleSize({ gamesPlayed: FULL_SAMPLE_MIN_GAMES })).toBe(
      false,
    );
  });
});
