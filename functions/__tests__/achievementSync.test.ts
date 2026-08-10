import { describe, expect, it } from "vitest";
import {
  filterUnlockedAchievementIds,
  unionUnlockedAchievementIds,
} from "../lib/achievementSync";

describe("achievementSync", () => {
  it("filters unknown and duplicate achievement ids", () => {
    expect(
      filterUnlockedAchievementIds([
        "nepotism",
        "not-a-badge",
        "nepotism",
        "founding-gm",
        12,
      ]),
    ).toEqual(["nepotism", "founding-gm"]);
  });

  it("migrates legacy dynasty into current ids", () => {
    expect(filterUnlockedAchievementIds(["dynasty"])).toEqual([
      "seventy-wins",
      "eighty-ovr",
    ]);
  });

  it("unions achievement lists without duplicates", () => {
    expect(
      unionUnlockedAchievementIds(
        ["nepotism", "seventy-wins"],
        ["seventy-wins", "founding-gm"],
        ["bogus"],
      ),
    ).toEqual(["nepotism", "seventy-wins", "founding-gm"]);
  });
});
