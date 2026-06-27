import { describe, expect, it } from "vitest";
import { getMatchModeTheme, matchModeThemeClass } from "./matchModeTheme";

describe("matchModeTheme", () => {
  it("maps draft modes to theme classes", () => {
    expect(getMatchModeTheme({ isDailyDraft: true })).toBe("daily");
    expect(getMatchModeTheme({ allTimeMode: true })).toBe("all-time");
    expect(getMatchModeTheme({ practiceMode: true })).toBe("practice");
    expect(getMatchModeTheme({ salaryCapMode: true })).toBe("ranked");
    expect(getMatchModeTheme({})).toBe("head-to-head");
  });

  it("prioritizes daily draft over other flags", () => {
    expect(
      getMatchModeTheme({
        isDailyDraft: true,
        allTimeMode: true,
        salaryCapMode: true,
      }),
    ).toBe("daily");
  });

  it("builds a mode theme class name", () => {
    expect(matchModeThemeClass("ranked")).toBe("mode-theme mode-theme--ranked");
  });
});
