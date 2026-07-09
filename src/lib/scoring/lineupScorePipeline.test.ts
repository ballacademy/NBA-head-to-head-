import { describe, expect, it } from "vitest";
import { buildLineupScorePipeline } from "./lineupScorePipeline";

describe("lineupScorePipeline", () => {
  it("sums explicit scoring layers into raw total", () => {
    const breakdown = {
      categories: [],
      strengths: [],
      warnings: [],
      statRawTotal: 70,
      productionScore: 10,
      totalPoints: 100,
    };
    const modifiers = {
      tierAdjustment: 2,
      impactBlend: 1,
      chemistry: 0.5,
      teamQuality: -1,
      lowScoringPenalty: 0,
      primaryScorerPenalty: 0,
      offenseFloorPenalty: 0,
      noStarPenalty: 0,
      eliteOffenseBonus: 1,
      superstarStackBonus: 0,
    };

    const pipeline = buildLineupScorePipeline(breakdown, modifiers);

    expect(pipeline.rawTotal).toBe(73.5);
    expect(pipeline.layers).toHaveLength(11);
    expect(pipeline.layers[0]?.id).toBe("baseStats");
  });
});
