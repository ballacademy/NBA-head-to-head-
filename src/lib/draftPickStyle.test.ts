import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { getPlayerPickShineClass } from "./draftPickStyle";
import { isAllStarPlayer, isSuperstarPlayer } from "./allStars";

describe("draftPickStyle", () => {
  it("applies superstar shine ahead of all-star shine", () => {
    const superstar = players.find((player) => isSuperstarPlayer(player));

    expect(superstar).toBeDefined();
    expect(getPlayerPickShineClass(superstar!)).toBe("player-pick--superstar");
  });

  it("applies all-star shine to non-superstar all-stars", () => {
    const allStar = players.find(
      (player) => isAllStarPlayer(player) && !isSuperstarPlayer(player),
    );

    expect(allStar).toBeDefined();
    expect(getPlayerPickShineClass(allStar!)).toBe("player-pick--all-star");
  });
});
