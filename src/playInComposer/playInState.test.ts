import { describe, expect, it } from "vitest";
import {
  GRAPHIC_ASPECT,
  PI_EIGHT_LABEL,
  playInBoardCols,
  playInMatchups,
} from "./playInLayout";
import {
  DEFAULT_PLAY_IN_TITLE,
  nineTenWinnerId,
  playInSeeds,
  playInSlotsFromStandings,
} from "./playInState";

describe("play-in matchups", () => {
  it("labels 7v8, 9v10, and the 8-seed game, with a 6-seed bye at 10", () => {
    expect(playInSeeds(8)).toEqual([7, 8, 9, 10]);
    expect(playInSeeds(10)).toEqual([6, 7, 8, 9, 10]);
    expect(playInMatchups(8)).toEqual({
      bye: null,
      pairs: [
        { label: "7v8", seeds: [7, 8], winnerLabel: "7 SEED" },
        { label: "9v10", seeds: [9, 10], winnerLabel: "9v10" },
      ],
      eightLabel: PI_EIGHT_LABEL,
    });
    expect(playInMatchups(10).bye).toBe(6);
    expect(DEFAULT_PLAY_IN_TITLE).toMatch(/PLAY-IN/);
  });

  it("lays out a 4:5 poster with huge logos and an 8-seed destination", () => {
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    const [east, west] = playInBoardCols(8);
    expect(east?.matches).toHaveLength(2);
    expect(west?.matches).toHaveLength(2);
    expect(east?.bye).toBeNull();
    expect(east?.matches[0]?.winner.label).toBe("7 SEED");
    expect(east?.matches[1]?.winner.label).toBe("9v10");
    expect(east?.eightSeed.label).toBe(PI_EIGHT_LABEL);
    const seven = east?.matches[0]?.slots[0];
    expect(seven?.h ?? 0).toBeGreaterThan(240);
    expect(seven?.w ?? 0).toBeGreaterThan(300);
    expect(east?.matches[0]?.lines.length).toBeGreaterThan(2);
    expect(east?.eightSeed.y).toBeGreaterThan(
      east?.matches[0]?.slots[1]?.y ?? 0,
    );
    expect(east?.eightSeed.y).toBeLessThan(
      east?.matches[1]?.slots[0]?.y ?? 0,
    );
    const ten = playInBoardCols(10);
    expect(ten[0]?.bye?.seed).toBe(6);
  });

  it("maps standings seeds 7–10 and puts the 9v10 winner on the 8-seed plate", () => {
    const slots = Array.from({ length: 15 }, (_, index) => `T${index + 1}`);
    expect(playInSlotsFromStandings(8, slots)).toEqual(["T7", "T8", "T9", "T10"]);
    expect(playInSlotsFromStandings(10, slots)[0]).toBe("T6");
    expect(
      nineTenWinnerId(["BOS", "NYK", "ATL", "CHI"], 8, {
        sevenEight: ["", ""],
        nineTen: ["120", "110"],
      }),
    ).toBe("ATL");
    expect(
      nineTenWinnerId(["BOS", "NYK", "ATL", "CHI"], 8, {
        sevenEight: ["", ""],
        nineTen: ["100", "118"],
      }),
    ).toBe("CHI");
  });
});
