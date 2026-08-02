import { describe, expect, it } from "vitest";
import { getPlayerHeadshotUrl } from "./playerHeadshots";
import type { TierListSharePlayer } from "./tierListShareCard";

describe("tierListShareCard headshot payload", () => {
  it("keeps bbr ids so QA downloads can resolve ESPN headshots", () => {
    const player: TierListSharePlayer = {
      name: "Luka Doncic",
      team: "DAL",
      position: "PG",
      bbrPlayerId: "doncilu01",
    };

    expect(getPlayerHeadshotUrl(player.bbrPlayerId)).toMatch(
      /espncdn\.com.*\/\d+\.png/,
    );
  });
});
