import { describe, expect, it } from "vitest";
import { getPlayerHeadshotUrl } from "./playerHeadshots";
import {
  formatTierListSharePlayerLabel,
  type TierListSharePlayer,
} from "./tierListShareCard";

describe("tierListShareCard", () => {
  it("labels chips with name and team only (no position)", () => {
    expect(
      formatTierListSharePlayerLabel({
        name: "Luka Doncic",
        team: "DAL",
      }),
    ).toBe("Luka Doncic · DAL");
  });

  it("keeps bbr ids so QA downloads can resolve ESPN headshots", () => {
    const player: TierListSharePlayer = {
      name: "Luka Doncic",
      team: "DAL",
      bbrPlayerId: "doncilu01",
    };

    expect(getPlayerHeadshotUrl(player.bbrPlayerId)).toMatch(
      /espncdn\.com.*\/\d+\.png/,
    );
  });
});
