import { describe, expect, it } from "vitest";
import { pickerHighlightIndex, pickerIdsFromQuery } from "./pickerKeyboard";

describe("picker keyboard", () => {
  it("wraps arrow highlights", () => {
    expect(pickerHighlightIndex(4, 0, 1)).toBe(1);
    expect(pickerHighlightIndex(4, 3, 1)).toBe(0);
    expect(pickerHighlightIndex(4, 0, -1)).toBe(3);
    expect(pickerHighlightIndex(0, 0, 1)).toBe(-1);
  });

  it("filters ids by typed name or extra team token", () => {
    const teams = [
      { id: "SAS", name: "San Antonio Spurs" },
      { id: "LAL", name: "Los Angeles Lakers" },
    ];
    expect(pickerIdsFromQuery(teams, "spurs")).toEqual(["SAS"]);
    expect(pickerIdsFromQuery(teams, "lal", (item) => item.id)).toEqual(["LAL"]);
    expect(pickerIdsFromQuery(teams, "")).toEqual(["SAS", "LAL"]);
  });
});
