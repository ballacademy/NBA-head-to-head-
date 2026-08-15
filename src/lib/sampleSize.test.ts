import { describe, expect, it } from "vitest";
import { findPlayerId, players } from "./playerPool";
import {
  ESTABLISHED_PRIOR_MIN_GAMES,
  FULL_SAMPLE_MIN_GAMES,
  getBlendablePriorSnapshot,
  getEstablishedProductionCredential,
  getPlayerStatWeight,
  getSeasonBlendShares,
  hasEstablishedPriorProduction,
  hasLimitedSampleSize,
  isSimilarPriorProduction,
  LIMITED_SAMPLE_WEIGHT_FLOOR,
  resolvePlayerForScoring,
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

  it("discounts limited-sample players without prior history", () => {
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

  it("keeps limited-sample label even when prior production exists", () => {
    // Anthony Davis: 20 GP this season, sizable prior season.
    const anthonyDavis = {
      bbrPlayerId: "davisan02",
      gamesPlayed: 20,
      points: 20.4,
    };
    expect(hasEstablishedPriorProduction(anthonyDavis)).toBe(true);
    expect(getEstablishedProductionCredential(anthonyDavis)).not.toBeNull();
    expect(hasLimitedSampleSize(anthonyDavis)).toBe(true);
    expect(getPlayerStatWeight(anthonyDavis)).toBe(1);

    // Still limited at 29 GP even with strong prior; 30+ clears the flag.
    const porzingisLimited = {
      bbrPlayerId: "porzikr01",
      gamesPlayed: 29,
      points: 16.7,
    };
    expect(hasEstablishedPriorProduction(porzingisLimited)).toBe(true);
    expect(hasLimitedSampleSize(porzingisLimited)).toBe(true);
    expect(getPlayerStatWeight(porzingisLimited)).toBe(1);

    const porzingisFull = {
      bbrPlayerId: "porzikr01",
      gamesPlayed: 30,
      points: 16.7,
    };
    expect(hasLimitedSampleSize(porzingisFull)).toBe(false);
    expect(getPlayerStatWeight(porzingisFull)).toBe(1);
    expect(getBlendablePriorSnapshot(porzingisFull)).toBeNull();
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
    // May still blend if any prior games exist; weight uses effective GP.
    const shares = getSeasonBlendShares(hotStreak);
    if (shares) {
      expect(getPlayerStatWeight(hotStreak)).toBeGreaterThan(
        LIMITED_SAMPLE_WEIGHT_FLOOR,
      );
    } else {
      expect(getPlayerStatWeight(hotStreak)).toBeLessThan(1);
    }
  });

  it("game-weights current and prior seasons for limited samples", () => {
    const kessler = players.find(
      (player) => player.id === findPlayerId("Walker Kessler"),
    );
    expect(kessler).toBeTruthy();
    expect(kessler!.gamesPlayed).toBeLessThan(FULL_SAMPLE_MIN_GAMES);

    const prior = getBlendablePriorSnapshot(kessler!);
    expect(prior).toBeTruthy();
    expect(prior!.gamesPlayed).toBeGreaterThanOrEqual(ESTABLISHED_PRIOR_MIN_GAMES);

    const shares = getSeasonBlendShares(kessler!)!;
    const totalGames = kessler!.gamesPlayed + prior!.gamesPlayed;
    expect(shares.currentShare).toBeCloseTo(kessler!.gamesPlayed / totalGames, 5);
    expect(shares.priorShare).toBeCloseTo(prior!.gamesPlayed / totalGames, 5);

    const blended = resolvePlayerForScoring(kessler!);
    const expectedPoints =
      kessler!.points * shares.currentShare + prior!.points * shares.priorShare;
    const expectedTs =
      kessler!.trueShooting * shares.currentShare +
      (prior!.trueShooting ?? kessler!.trueShooting) * shares.priorShare;

    expect(blended.points).toBeCloseTo(expectedPoints, 5);
    expect(blended.trueShooting).toBeCloseTo(expectedTs, 5);
    // Tiny-sample heater should be pulled toward the larger prior sample.
    expect(blended.trueShooting).toBeLessThan(kessler!.trueShooting);
    expect(blended.trueShooting).toBeGreaterThan(prior!.trueShooting! - 0.01);
  });

  it("requires a sizable prior sample before calling production established", () => {
    expect(ESTABLISHED_PRIOR_MIN_GAMES).toBeGreaterThanOrEqual(35);
    expect(isSimilarPriorProduction(20.4, 24.7)).toBe(true);
    expect(isSimilarPriorProduction(16.3, 5.7)).toBe(false);
  });
});
