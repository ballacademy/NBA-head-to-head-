import { describe, expect, it } from "vitest";
import { getTeamColors } from "./teamColors";

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
});
