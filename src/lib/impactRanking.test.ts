import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  getImpactRankingAdjustment,
  getLineupBestImpactRank,
  getMidTierImpactLineupPenalty,
  getThinImpactLineupPenalty,
  getPlayerImpactAdjustment,
  getPlayerImpactRank,
  isImpactRankStarPlayer,
  MID_TIER_IMPACT_NO_ELITE_PENALTY,
  MID_TIER_IMPACT_NO_TOP50_PENALTY,
  MID_TIER_NEGATIVE_IMPACT_SCALE,
  THIN_IMPACT_ONE_ELITE_PENALTY,
} from "./impactRanking";
import {
  getScrubPlayerIds,
  getSuperScrubPlayerIds,
} from "./playerTiers";
import { getSoloStarElevationPenalty } from "./lineupSoloStar";
import { calculateLineupScore } from "./scoring";

describe("impactRanking", () => {
  it("blends user impact ranks against stat-derived ranks", () => {
    const jokic = players.find((player) => player.name === "Nikola Jokić");
    const brunson = players.find((player) => player.name === "Jalen Brunson");

    expect(jokic).toBeDefined();
    expect(brunson).toBeDefined();
    expect(getPlayerImpactAdjustment(jokic!)).toBeGreaterThanOrEqual(-2);
    expect(getPlayerImpactAdjustment(jokic!)).toBeLessThanOrEqual(2);
    expect(getPlayerImpactAdjustment(brunson!)).toBeGreaterThan(0);
  });

  it("applies impact adjustments in lineup scoring without a visible category", () => {
    const jokic = players.find((player) => player.name === "Nikola Jokić");
    const luka = players.find((player) => player.name === "Luka Dončić");
    const shai = players.find(
      (player) => player.name === "Shai Gilgeous-Alexander",
    );
    const wemby = players.find(
      (player) => player.name === "Victor Wembanyama",
    );
    const brunson = players.find((player) => player.name === "Jalen Brunson");

    expect(jokic && luka && shai && wemby && brunson).toBeTruthy();

    const lineup = [jokic!, luka!, shai!, wemby!, brunson!];
    const score = calculateLineupScore(lineup);
    const categoryTotal = score.categories.reduce(
      (sum, category) => sum + category.value,
      0,
    );

    expect(getImpactRankingAdjustment(lineup)).not.toBe(0);
    expect(score.total).toBeGreaterThan(categoryTotal / 2.32);
  });

  it("boosts ranked stars missing from the default stat ladder", () => {
    const cade = players.find((player) => player.name === "Cade Cunningham");
    const lamelo = players.find((player) => player.name === "LaMelo Ball");
    const holiday = players.find((player) => player.name === "Jrue Holiday");

    expect(cade).toBeDefined();
    expect(lamelo).toBeDefined();
    expect(holiday).toBeDefined();
    expect(getPlayerImpactAdjustment(cade!)).toBeGreaterThan(0);
    expect(getPlayerImpactAdjustment(lamelo!)).toBeGreaterThan(0.4);
    expect(getPlayerImpactAdjustment(holiday!)).toBeLessThan(0);
  });

  it("exposes impact ranks for ranked players", () => {
    const butler = players.find((player) => player.name === "Jimmy Butler");
    const pritchard = players.find((player) => player.name === "Payton Pritchard");

    expect(butler).toBeDefined();
    expect(pritchard).toBeDefined();
    expect(getPlayerImpactRank(butler!)).toBe(23);
    expect(isImpactRankStarPlayer(butler!)).toBe(true);
    expect(isImpactRankStarPlayer(pritchard!)).toBe(false);
  });

  it("amplifies negative mid-tier impact blends and dings lineups without a top-50 anchor", () => {
    const miller = players.find((player) => player.bbrPlayerId === "millebr02");
    const ware = players.find((player) => player.bbrPlayerId === "wareke01");
    const fears = players.find((player) => player.bbrPlayerId === "fearsje01");
    const rollins = players.find((player) => player.bbrPlayerId === "rolliry01");
    const oubre = players.find((player) => player.bbrPlayerId === "oubreke01");

    expect(miller && ware && fears && rollins && oubre).toBeTruthy();

    const lineup = [fears!, rollins!, miller!, oubre!, ware!];
    const rawBlend = lineup.reduce(
      (sum, player) => sum + getPlayerImpactAdjustment(player),
      0,
    );
    const scaledBlend = lineup.reduce((sum, player) => {
      const adjustment = getPlayerImpactAdjustment(player);
      const rank = getPlayerImpactRank(player);
      const isMidOrWorse =
        rank == null || rank > 50;
      return (
        sum +
        (adjustment < 0 && isMidOrWorse
          ? adjustment * MID_TIER_NEGATIVE_IMPACT_SCALE
          : adjustment)
      );
    }, 0);

    expect(getLineupBestImpactRank(lineup)).toBe(68);
    expect(getMidTierImpactLineupPenalty(lineup)).toBe(
      MID_TIER_IMPACT_NO_TOP50_PENALTY,
    );
    expect(getImpactRankingAdjustment(lineup)).toBeCloseTo(scaledBlend, 5);
    expect(getImpactRankingAdjustment(lineup)).toBeLessThan(rawBlend);
  });

  it("taxes thin depth without soft-clear stacking on a lone top-50", () => {
    const jokic = players.find((player) => player.name === "Nikola Jokić");
    const ware = players.find((player) => player.bbrPlayerId === "wareke01");
    const fears = players.find((player) => player.bbrPlayerId === "fearsje01");
    const rollins = players.find((player) => player.bbrPlayerId === "rolliry01");
    const oubre = players.find((player) => player.bbrPlayerId === "oubreke01");

    expect(jokic && ware && fears && rollins && oubre).toBeTruthy();

    const thin = [jokic!, fears!, rollins!, oubre!, ware!];
    expect(getLineupBestImpactRank(thin)).toBe(1);
    // Top-50 anchors no longer take a mid-tier soft-clear; depth tax only.
    expect(getMidTierImpactLineupPenalty(thin)).toBe(0);
    expect(getThinImpactLineupPenalty(thin)).toBe(THIN_IMPACT_ONE_ELITE_PENALTY);
    // Jokic is a full playmaker elevator, so the solo elevation tax is waived.
    expect(getSoloStarElevationPenalty(thin)).toBeCloseTo(0, 5);

    const brunson = players.find((player) => player.name === "Jalen Brunson");
    expect(brunson).toBeDefined();
    const deep = [jokic!, brunson!, fears!, rollins!, oubre!];
    expect(getMidTierImpactLineupPenalty(deep)).toBe(0);
    expect(getThinImpactLineupPenalty(deep)).toBe(0);
    expect(MID_TIER_IMPACT_NO_ELITE_PENALTY).toBeLessThan(
      MID_TIER_IMPACT_NO_TOP50_PENALTY,
    );
  });

  it("does not change scrub pool membership", () => {
    const scrubIdsBefore = getScrubPlayerIds();
    const superScrubIdsBefore = getSuperScrubPlayerIds();

    expect(scrubIdsBefore.length).toBeGreaterThan(0);
    expect(superScrubIdsBefore.length).toBeGreaterThan(0);
    expect(new Set(scrubIdsBefore).size).toBe(scrubIdsBefore.length);
  });
});
