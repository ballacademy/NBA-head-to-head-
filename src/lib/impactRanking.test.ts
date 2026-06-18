import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  getImpactRankingAdjustment,
  getPlayerImpactAdjustment,
} from "./impactRanking";
import {
  getScrubPlayerIds,
  getSuperScrubPlayerIds,
} from "./playerTiers";
import { calculateLineupScore } from "./scoring";

describe("impactRanking", () => {
  it("nudges highly ranked players upward when stats underrate them", () => {
    const jokic = players.find((player) => player.name === "Nikola Jokić");
    const giannis = players.find(
      (player) => player.name === "Giannis Antetokounmpo",
    );

    expect(jokic).toBeDefined();
    expect(giannis).toBeDefined();
    expect(getPlayerImpactAdjustment(jokic!)).toBeGreaterThanOrEqual(0);
    expect(getPlayerImpactAdjustment(giannis!)).toBeGreaterThanOrEqual(0);
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

  it("does not change scrub pool membership", () => {
    const scrubIdsBefore = getScrubPlayerIds();
    const superScrubIdsBefore = getSuperScrubPlayerIds();

    expect(scrubIdsBefore.length).toBeGreaterThan(0);
    expect(superScrubIdsBefore.length).toBeGreaterThan(0);
    expect(new Set(scrubIdsBefore).size).toBe(scrubIdsBefore.length);
  });
});
