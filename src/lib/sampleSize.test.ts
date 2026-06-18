import { describe, expect, it } from "vitest";
import {
  FULL_SAMPLE_MIN_GAMES,
  getPlayerStatWeight,
  hasLimitedSampleSize,
  LIMITED_SAMPLE_WEIGHT_FLOOR,
} from "./sampleSize";

describe("sampleSize", () => {
  it("flags players below the full-sample game threshold", () => {
    expect(hasLimitedSampleSize({ gamesPlayed: FULL_SAMPLE_MIN_GAMES - 1 })).toBe(
      true,
    );
    expect(hasLimitedSampleSize({ gamesPlayed: FULL_SAMPLE_MIN_GAMES })).toBe(
      false,
    );
  });

  it("discounts limited-sample players without zeroing them out", () => {
    expect(getPlayerStatWeight({ gamesPlayed: FULL_SAMPLE_MIN_GAMES })).toBe(1);
    expect(getPlayerStatWeight({ gamesPlayed: 7 })).toBe(0.5);
    expect(getPlayerStatWeight({ gamesPlayed: 1 })).toBe(
      LIMITED_SAMPLE_WEIGHT_FLOOR,
    );
  });
});
