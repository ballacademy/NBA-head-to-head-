import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  lookupPlayerHeightInches,
  resolvePlayerHeightInches,
} from "./playerHeights";

describe("playerHeights", () => {
  it("loads Wembanyama at 7'4\" from the height sync", () => {
    expect(lookupPlayerHeightInches("wembavi01")).toBe(88);
  });

  it("makes Wembanyama the tallest player in the draft pool", () => {
    const wemby = players.find((player) => player.bbrPlayerId === "wembavi01");
    expect(wemby).toBeDefined();
    expect(wemby!.heightInches).toBe(88);

    const tallest = Math.max(...players.map((player) => player.heightInches));
    expect(tallest).toBe(wemby!.heightInches);
  });

  it("falls back to a position estimate when no height is known", () => {
    expect(
      resolvePlayerHeightInches({
        position: "PG",
        seed: "ab",
      }),
    ).toBeGreaterThan(70);
  });
});
