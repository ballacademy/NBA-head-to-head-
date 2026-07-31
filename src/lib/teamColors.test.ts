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

  it("keeps Heat outlines reddish-orange instead of yellow gold", () => {
    expect(getTeamGlowColor("MIA").toLowerCase()).toBe("#ff4a1f");
  });

  it("prefers recognizable brand hues over dull secondaries", () => {
    expect(getTeamGlowColor("MIL").toLowerCase()).toBe("#1f9a4a");
    expect(getTeamGlowColor("DAL").toLowerCase()).toBe("#1a7ab8");
    expect(getTeamGlowColor("SAC").toLowerCase()).toBe("#9b5de5");
    expect(getTeamGlowColor("PHI").toLowerCase()).toBe("#1a8ad4");
    expect(getTeamGlowColor("LAL").toLowerCase()).toBe("#9b5de8");
    expect(getTeamGlowColor("PHX").toLowerCase()).toBe("#f06a28");
  });
});
