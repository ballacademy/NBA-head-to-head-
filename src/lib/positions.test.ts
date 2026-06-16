import { describe, expect, it } from "vitest";
import {
  buildPlayerPositions,
  formatPlayerPositions,
  parsePositionString,
  playerMatchesPosition,
} from "./positions";

describe("positions", () => {
  it("parses hyphenated and slash-separated position labels", () => {
    expect(parsePositionString("SF-PF")).toEqual(["SF", "PF"]);
    expect(parsePositionString("G")).toEqual(["PG", "SG"]);
    expect(parsePositionString("F")).toEqual(["SF", "PF"]);
  });

  it("builds multi-position eligibility from stats", () => {
    const positions = buildPlayerPositions({
      position: "SF",
      assists: 2,
      rebounds: 7,
      blocks: 1,
    });

    expect(positions).toContain("SF");
    expect(positions).toContain("PF");
    expect(formatPlayerPositions(positions)).toBe("SF / PF");
  });

  it("matches players against any eligible position", () => {
    expect(
      playerMatchesPosition({ positions: ["SF", "PF"] }, "PF"),
    ).toBe(true);
    expect(
      playerMatchesPosition({ positions: ["SF", "PF"] }, "C"),
    ).toBe(false);
  });
});
