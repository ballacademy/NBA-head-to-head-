import { describe, expect, it } from "vitest";
import { getTeamColors, getTeamGlowColor } from "./teamColors";

describe("teamColors", () => {
  it("returns team primary and secondary colors", () => {
    expect(getTeamColors("LAL")).toEqual({
      primary: "#552583",
      secondary: "#FDB927",
    });
  });

  it("falls back for unknown teams", () => {
    expect(getTeamColors("UNK").primary).toBeTruthy();
  });

  it("uses brighter glow accents for dark navy team borders", () => {
    expect(getTeamGlowColor("DEN")).toBe("#FEC524");
    expect(getTeamGlowColor("UTA")).toBe("#F9A01B");
    expect(getTeamGlowColor("MIN")).toBe("#78BE20");
    expect(getTeamGlowColor("OKC").toLowerCase()).not.toBe("#000000");
  });
});
