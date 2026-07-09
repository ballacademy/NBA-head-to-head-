import { describe, expect, it } from "vitest";
import { parseDailyLineupJson, parseDailyMode } from "../lib/dailyScoresDb";

describe("dailyScoresDb", () => {
  it("parses valid lineup json", () => {
    expect(parseDailyLineupJson(JSON.stringify(["a", "b", "c", "d", "e"]))).toEqual(
      ["a", "b", "c", "d", "e"],
    );
  });

  it("rejects malformed or partial lineups", () => {
    expect(parseDailyLineupJson("not-json")).toBeNull();
    expect(parseDailyLineupJson(JSON.stringify(["a", "b"]))).toBeNull();
    expect(parseDailyLineupJson(JSON.stringify({ ids: [] }))).toBeNull();
  });

  it("defaults daily mode to basic", () => {
    expect(parseDailyMode("advanced")).toBe("advanced");
    expect(parseDailyMode("invalid")).toBe("basic");
    expect(parseDailyMode(null)).toBe("basic");
  });
});
