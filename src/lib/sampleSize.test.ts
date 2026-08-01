import { describe, expect, it } from "vitest";
import {
  ESTABLISHED_PRIOR_MIN_GAMES,
  FULL_SAMPLE_MIN_GAMES,
  getEstablishedProductionCredential,
  getPlayerStatWeight,
  hasEstablishedPriorProduction,
  hasLimitedSampleSize,
  isSimilarPriorProduction,
  LIMITED_SAMPLE_WEIGHT_FLOOR,
} from "./sampleSize";

describe("sampleSize", () => {
  it("flags players below the full-sample game threshold", () => {
    expect(
      hasLimitedSampleSize({
        gamesPlayed: FULL_SAMPLE_MIN_GAMES - 1,
        points: 12,
      }),
    ).toBe(true);
    expect(
      hasLimitedSampleSize({
        gamesPlayed: FULL_SAMPLE_MIN_GAMES,
        points: 12,
      }),
    ).toBe(false);
  });

  it("discounts limited-sample players without zeroing them out", () => {
    expect(
      getPlayerStatWeight({
        gamesPlayed: FULL_SAMPLE_MIN_GAMES,
        points: 12,
      }),
    ).toBe(1);
    expect(
      getPlayerStatWeight({
        gamesPlayed: FULL_SAMPLE_MIN_GAMES / 2,
        points: 12,
      }),
    ).toBeCloseTo(0.5, 5);
    expect(
      getPlayerStatWeight({
        gamesPlayed: 1,
        points: 12,
      }),
    ).toBe(LIMITED_SAMPLE_WEIGHT_FLOOR);
  });

  it("treats similar prior-season production as an established sample", () => {
    // Anthony Davis: 20 GP this season, 51 GP at 24.7 PPG last season.
    const anthonyDavis = {
      bbrPlayerId: "davisan02",
      gamesPlayed: 20,
      points: 20.4,
    };
    expect(hasEstablishedPriorProduction(anthonyDavis)).toBe(true);
    expect(getEstablishedProductionCredential(anthonyDavis)).not.toBeNull();
    expect(hasLimitedSampleSize(anthonyDavis)).toBe(false);
    expect(getPlayerStatWeight(anthonyDavis)).toBe(1);

    // Kristaps Porziņģis: 32 GP this season, 42 GP at 19.5 PPG last season.
    const porzingis = {
      bbrPlayerId: "porzikr01",
      gamesPlayed: 32,
      points: 16.7,
    };
    expect(hasEstablishedPriorProduction(porzingis)).toBe(true);
    expect(hasLimitedSampleSize(porzingis)).toBe(false);
    expect(getPlayerStatWeight(porzingis)).toBe(1);
  });

  it("still dings tiny hot streaks without matching prior production", () => {
    const hotStreak = {
      bbrPlayerId: "whiteda01",
      gamesPlayed: 6,
      points: 16.3,
    };
    // Prior season was a small/low-scoring cup of coffee, not similar production.
    expect(hasEstablishedPriorProduction(hotStreak)).toBe(false);
    expect(getEstablishedProductionCredential(hotStreak)).toBeNull();
    expect(hasLimitedSampleSize(hotStreak)).toBe(true);
    expect(getPlayerStatWeight(hotStreak)).toBeLessThan(1);
  });

  it("requires a sizable prior sample before waiving the ding", () => {
    expect(ESTABLISHED_PRIOR_MIN_GAMES).toBeGreaterThanOrEqual(35);
    expect(isSimilarPriorProduction(20.4, 24.7)).toBe(true);
    expect(isSimilarPriorProduction(16.3, 5.7)).toBe(false);
  });
});
