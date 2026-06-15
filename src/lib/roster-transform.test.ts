import { describe, expect, it } from "vitest";
// @ts-expect-error - untyped JS helper module shared with the fetch script.
import { deriveStyles, mapPositions, slug, statsFromAverage, trueShooting } from "../../scripts/roster-transform.mjs";

describe("slug", () => {
  it("normalizes names into stable ids", () => {
    expect(slug("Shai Gilgeous-Alexander")).toBe("shai-gilgeous-alexander");
    expect(slug("De'Aaron Fox")).toBe("de-aaron-fox");
    expect(slug("Nikola Jokić")).toBe("nikola-jokic");
  });
});

describe("mapPositions", () => {
  it("maps coarse feed positions to a primary + secondary set", () => {
    expect(mapPositions("G")).toEqual(["PG", ["SG"]]);
    expect(mapPositions("F-C")).toEqual(["PF", ["C"]]);
    expect(mapPositions("C")).toEqual(["C", ["PF"]]);
    expect(mapPositions("")[0]).toBeNull();
  });
});

describe("trueShooting", () => {
  it("computes TS% from points, field goals, and free throws", () => {
    // 25 pts on 18 fga + 6 fta => 25 / (2 * (18 + 2.64)) = 0.6056
    expect(trueShooting({ pts: 25, fga: 18, fta: 6 })).toBeCloseTo(0.6056, 3);
  });

  it("returns 0 when a player has taken no shots", () => {
    expect(trueShooting({ pts: 0, fga: 0, fta: 0 })).toBe(0);
  });
});

describe("statsFromAverage", () => {
  it("produces a complete, rounded stat line", () => {
    const stats = statsFromAverage(
      {
        pts: 27.3,
        reb: 7.1,
        ast: 6.4,
        stl: 1.2,
        blk: 0.6,
        fga: 19.2,
        fta: 6.1,
        turnover: 3.1,
        fg3_pct: 0.381,
      },
      "PG",
    );

    expect(stats.points).toBe(27.3);
    expect(stats.threePoint).toBe(0.381);
    expect(stats.trueShooting).toBeGreaterThan(0.55);
    expect(stats.usage).toBeGreaterThan(8);
    expect(stats.defense).toBeGreaterThanOrEqual(4);
    expect(stats.defense).toBeLessThanOrEqual(10);
  });
});

describe("deriveStyles", () => {
  it("tags a high-scoring playmaker as an engine/scorer", () => {
    const styles = deriveStyles(
      { points: 28, assists: 8, threePoint: 0.38, defense: 7, blocks: 0.4, usage: 32 },
      "PG",
    );
    expect(styles).toContain("engine");
    expect(styles).toContain("scorer");
  });

  it("always returns at least one style", () => {
    const styles = deriveStyles(
      { points: 6, assists: 1, threePoint: 0.2, defense: 6, blocks: 0.5, usage: 12 },
      "C",
    );
    expect(styles.length).toBeGreaterThan(0);
  });
});
