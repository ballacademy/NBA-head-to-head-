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
    // Luka: tiny current sample, sizable 2025-26 prior season.
    const doncic = {
      bbrPlayerId: "doncilu01",
      gamesPlayed: 2,
      points: 30,
    };
    expect(hasEstablishedPriorProduction(doncic)).toBe(true);
    expect(getEstablishedProductionCredential(doncic)).not.toBeNull();
    expect(hasLimitedSampleSize(doncic)).toBe(true);
    expect(getPlayerStatWeight(doncic)).toBe(1);

    // Still limited at 29 GP even with strong prior; 30+ clears the flag.
    const doncicLimited = {
      bbrPlayerId: "doncilu01",
      gamesPlayed: 29,
      points: 33.5,
    };
    expect(hasEstablishedPriorProduction(doncicLimited)).toBe(true);
    expect(hasLimitedSampleSize(doncicLimited)).toBe(true);
    expect(getPlayerStatWeight(doncicLimited)).toBe(1);

    const doncicFull = {
      bbrPlayerId: "doncilu01",
      gamesPlayed: 30,
      points: 33.5,
    };
    expect(hasLimitedSampleSize(doncicFull)).toBe(false);
    expect(getPlayerStatWeight(doncicFull)).toBe(1);
    expect(getBlendablePriorSnapshot(doncicFull)).toBeNull();
  });

  it("still dings tiny hot streaks without matching prior production", () => {
    const hotStreak = {
      bbrPlayerId: "whiteda01",
      gamesPlayed: 2,
      points: 28,
    };
    // Prior season was a small cup of coffee, not similar production.
    expect(hasEstablishedPriorProduction(hotStreak)).toBe(false);
    expect(getEstablishedProductionCredential(hotStreak)).toBeNull();
    expect(hasLimitedSampleSize(hotStreak)).toBe(true);
    // May still blend if any prior games exist; weight uses effective GP.
    const shares = getSeasonBlendShares(hotStreak);
    if (shares) {
      expect(getPlayerStatWeight(hotStreak)).toBeGreaterThanOrEqual(
        LIMITED_SAMPLE_WEIGHT_FLOOR,
      );
    } else {
      expect(getPlayerStatWeight(hotStreak)).toBeLessThan(1);
    }
  });

  it("game-weights current and prior seasons for limited samples", () => {
    const doncic = players.find(
      (player) => player.id === findPlayerId("Luka Doncic"),
    );
    expect(doncic).toBeTruthy();
    expect(doncic!.gamesPlayed).toBeLessThan(FULL_SAMPLE_MIN_GAMES);

    const prior = getBlendablePriorSnapshot(doncic!);
    expect(prior).toBeTruthy();
    expect(prior!.gamesPlayed).toBeGreaterThanOrEqual(ESTABLISHED_PRIOR_MIN_GAMES);

    const shares = getSeasonBlendShares(doncic!)!;
    const totalGames = doncic!.gamesPlayed + prior!.gamesPlayed;
    expect(shares.currentShare).toBeCloseTo(doncic!.gamesPlayed / totalGames, 5);
    expect(shares.priorShare).toBeCloseTo(prior!.gamesPlayed / totalGames, 5);
    // Early season: prior games dominate the blend share.
    expect(shares.priorShare).toBeGreaterThan(shares.currentShare);

    const blended = resolvePlayerForScoring(doncic!);
    const expectedPoints =
      doncic!.points * shares.currentShare + prior!.points * shares.priorShare;
    const expectedTs =
      doncic!.trueShooting * shares.currentShare +
      (prior!.trueShooting ?? doncic!.trueShooting) * shares.priorShare;

    expect(blended.points).toBeCloseTo(expectedPoints, 5);
    expect(blended.trueShooting).toBeCloseTo(expectedTs, 5);
    // Defense grades soft-regress toward average with the same game weights.
    expect(blended.defenseGrade).toBeDefined();
  });

  it("requires a sizable prior sample before calling production established", () => {
    expect(ESTABLISHED_PRIOR_MIN_GAMES).toBeGreaterThanOrEqual(35);
    expect(isSimilarPriorProduction(20.4, 24.7)).toBe(true);
    expect(isSimilarPriorProduction(16.3, 5.7)).toBe(false);
  });
});
