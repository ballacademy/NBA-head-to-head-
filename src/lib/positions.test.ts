import { describe, expect, it } from "vitest";
import {
  buildPlayerPositions,
  capPositions,
  comparePositions,
  formatPlayerPositions,
  MAX_PLAYER_POSITIONS,
  parsePositionString,
  playerMatchesPosition,
  sortPositions,
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

  it("keeps the listed primary position ahead of stat-inferred slots", () => {
    const jaylenBrown = buildPlayerPositions({
      position: "SF",
      assists: 5.1,
      rebounds: 6.9,
      blocks: 0.4,
    });
    const devinBooker = buildPlayerPositions({
      position: "SG",
      assists: 6.0,
      rebounds: 3.9,
      blocks: 0.3,
    });

    expect(jaylenBrown[0]).toBe("SF");
    expect(jaylenBrown).toContain("SG");
    expect(devinBooker[0]).toBe("SG");
    expect(devinBooker).toContain("PG");
  });

  it("uses the first token as the primary for hyphenated labels", () => {
    expect(buildPlayerPositions({
      position: "PF-C",
      assists: 2,
      rebounds: 11,
      blocks: 1.7,
    })[0]).toBe("PF");
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

  it("orders positions from point guard to center", () => {
    expect(comparePositions("PG", "SG")).toBeLessThan(0);
    expect(comparePositions("C", "PF")).toBeGreaterThan(0);
    expect(
      sortPositions(["C", "PG", "SF", "SG", "PF"]),
    ).toEqual(["PG", "SG", "SF", "PF", "C"]);
  });
});
