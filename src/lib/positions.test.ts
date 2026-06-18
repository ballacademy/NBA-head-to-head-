import { describe, expect, it } from "vitest";
import {
  buildPlayerPositions,
  capPositions,
  formatPlayerPositions,
  MAX_PLAYER_POSITIONS,
  parsePositionString,
  playerMatchesPosition,
} from "./positions";

describe("positions", () => {
  it("parses hyphenated and slash-separated position labels", () => {
    expect(parsePositionString("SF-PF")).toEqual(["SF", "PF"]);
    expect(parsePositionString("G")).toEqual(["PG", "SG"]);
    expect(parsePositionString("F")).toEqual(["SF", "PF"]);
  });

  it("caps parsed position lists at two slots", () => {
    expect(parsePositionString("PG-SG-SF")).toEqual(["PG", "SG"]);
    expect(capPositions(["PG", "SG", "SF"])).toEqual(["PG", "SG"]);
    expect(MAX_PLAYER_POSITIONS).toBe(2);
  });

  it("builds at most two eligible positions from stats", () => {
    const positions = buildPlayerPositions({
      position: "SF",
      assists: 2,
      rebounds: 7,
      blocks: 1,
    });

    expect(positions).toEqual(["SF", "PF"]);
    expect(positions.length).toBeLessThanOrEqual(2);
    expect(formatPlayerPositions(positions)).toBe("SF / PF");
  });

  it("only gives center eligibility to true bigs", () => {
    const keeganMurray = buildPlayerPositions({
      position: "PF",
      assists: 2,
      rebounds: 5.7,
      blocks: 1.6,
    });
    const anthonyDavis = buildPlayerPositions({
      position: "PF",
      assists: 3,
      rebounds: 11.1,
      blocks: 1.7,
    });

    expect(keeganMurray).not.toContain("C");
    expect(anthonyDavis).toContain("C");
    expect(anthonyDavis.length).toBeLessThanOrEqual(2);
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
