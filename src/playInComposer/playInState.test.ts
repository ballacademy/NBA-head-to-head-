import { describe, expect, it } from "vitest";
import { GRAPHIC_ASPECT, playInBoardCols, playInMatchups } from "./playInLayout";
import { playInSeeds } from "./playInState";

describe("play-in matchups", () => {
  it("labels 7v8 and 9v10 on both field sizes, with a 6-seed bye at 10", () => {
    expect(playInSeeds(8)).toEqual([7, 8, 9, 10]);
    expect(playInSeeds(10)).toEqual([6, 7, 8, 9, 10]);
    expect(playInMatchups(8)).toEqual({
      bye: null,
      pairs: [
        { label: "7v8", seeds: [7, 8] },
        { label: "9v10", seeds: [9, 10] },
      ],
    });
    expect(playInMatchups(10).bye).toBe(6);
    expect(playInMatchups(10).pairs.map((pair) => pair.label)).toEqual([
      "7v8",
      "9v10",
    ]);
  });

  it("lays out a 4:5 board with inside connecting brackets", () => {
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    const [east, west] = playInBoardCols(8);
    expect(east?.matches).toHaveLength(2);
    expect(west?.matches).toHaveLength(2);
    expect(east?.bye).toBeNull();
    const seven = east?.matches[0]?.slots[0];
    const eight = east?.matches[0]?.slots[1];
    expect(seven?.h ?? 0).toBeGreaterThan(180);
    expect(eight?.y ?? 0).toBeGreaterThan((seven?.y ?? 0) + (seven?.h ?? 0));
    expect(east?.matches[0]?.line.side).toBe("east");
    expect(west?.matches[0]?.line.side).toBe("west");
    const ten = playInBoardCols(10);
    expect(ten[0]?.bye?.seed).toBe(6);
  });
});
