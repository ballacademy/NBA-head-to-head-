import { describe, expect, it } from "vitest";
import {
  buildDefensiveRatings,
  computeDefensivePercentile,
  gradeFromPercentile,
} from "./defenseRating";

describe("defenseRating", () => {
  it("ranks stronger defenders above weaker ones", () => {
    const players = [
      {
        id: "elite",
        steals: 2.1,
        blocks: 2.4,
        defensiveRebounds: 9.5,
        defensiveWinShares: 3.8,
        defensiveBoxPlusMinus: 2.5,
        defensiveReboundPct: 24,
        stealPct: 2.8,
        blockPct: 5.5,
      },
      {
        id: "average",
        steals: 1.0,
        blocks: 0.6,
        defensiveRebounds: 4.2,
        defensiveWinShares: 1.4,
        defensiveBoxPlusMinus: -0.2,
        defensiveReboundPct: 14,
        stealPct: 1.4,
        blockPct: 1.1,
      },
      {
        id: "weak",
        steals: 0.4,
        blocks: 0.2,
        defensiveRebounds: 1.8,
        defensiveWinShares: 0.2,
        defensiveBoxPlusMinus: -2.8,
        defensiveReboundPct: 8,
        stealPct: 0.7,
        blockPct: 0.4,
      },
    ];

    const ratings = buildDefensiveRatings(players);

    expect(ratings.get("elite")?.grade).toMatch(/^[AB]/);
    expect(ratings.get("weak")?.grade).toMatch(/^[CDF]/);
    expect(
      (ratings.get("elite")?.defense ?? 0) > (ratings.get("weak")?.defense ?? 0),
    ).toBe(true);
  });

  it("maps percentiles to letter grades", () => {
    expect(gradeFromPercentile(98)).toBe("A+");
    expect(gradeFromPercentile(90)).toBe("A-");
    expect(gradeFromPercentile(72)).toBe("B-");
    expect(gradeFromPercentile(10)).toBe("F");
  });

  it("handles missing advanced stats by using available box score data", () => {
    const players = [
      {
        id: "box-only",
        steals: 1.8,
        blocks: 1.1,
        defensiveRebounds: 6.4,
      },
      {
        id: "box-only-2",
        steals: 0.5,
        blocks: 0.3,
        defensiveRebounds: 2.1,
      },
    ];

    const percentile = computeDefensivePercentile(
      players[0],
      new Map([
        ["steals", [0.5, 1.8]],
        ["blocks", [0.3, 1.1]],
        ["defensiveRebounds", [2.1, 6.4]],
      ]),
    );

    expect(percentile).toBeGreaterThan(50);
  });
});
