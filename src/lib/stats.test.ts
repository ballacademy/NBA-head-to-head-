import { describe, expect, it } from "vitest";
import { blendStats, resolvePlayer } from "./stats";
import type { Player } from "./types";

const basePlayer: Player = {
  id: "test-player",
  name: "Test Player",
  team: "TST",
  position: "PG",
  points: 20,
  rebounds: 4,
  assists: 8,
  steals: 1,
  blocks: 0.4,
  trueShooting: 0.6,
  threePoint: 0.4,
  usage: 28,
  defense: 7,
  styles: ["engine"],
};

describe("blendStats", () => {
  it("returns regular season stats unchanged when there is no postseason", () => {
    expect(blendStats(basePlayer)).toEqual({
      points: 20,
      rebounds: 4,
      assists: 8,
      steals: 1,
      blocks: 0.4,
      trueShooting: 0.6,
      threePoint: 0.4,
      usage: 28,
      defense: 7,
    });
  });

  it("weights regular season 75% and postseason 25% when playoffs exist", () => {
    const blended = blendStats({
      ...basePlayer,
      postseason: {
        points: 28,
        rebounds: 8,
        assists: 4,
        steals: 2,
        blocks: 0.8,
        trueShooting: 0.56,
        threePoint: 0.32,
        usage: 32,
        defense: 9,
      },
    });

    // 20 * 0.75 + 28 * 0.25 = 22
    expect(blended.points).toBe(22);
    // 8 * 0.75 + 4 * 0.25 = 7
    expect(blended.assists).toBe(7);
    // 0.6 * 0.75 + 0.56 * 0.25 = 0.59
    expect(blended.trueShooting).toBe(0.59);
    // 0.4 * 0.75 + 0.32 * 0.25 = 0.38
    expect(blended.threePoint).toBe(0.38);
    // 7 * 0.75 + 9 * 0.25 = 7.5
    expect(blended.defense).toBe(7.5);
  });
});

describe("resolvePlayer", () => {
  it("flags resolved players that include postseason games", () => {
    const withoutPlayoffs = resolvePlayer(basePlayer);
    expect(withoutPlayoffs.blended).toBe(false);
    expect("postseason" in withoutPlayoffs).toBe(false);

    const withPlayoffs = resolvePlayer({
      ...basePlayer,
      postseason: {
        points: 24,
        rebounds: 4,
        assists: 8,
        steals: 1,
        blocks: 1,
        trueShooting: 0.6,
        threePoint: 0.4,
        usage: 28,
        defense: 7,
      },
    });
    expect(withPlayoffs.blended).toBe(true);
  });
});
