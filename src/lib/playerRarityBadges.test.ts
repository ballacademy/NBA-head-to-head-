import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { getPlayerRarityBadgeItems } from "./playerRarityBadges";
import { getScrubPlayerIds, getSuperScrubPlayerIds } from "./playerTiers";
import { playersById } from "./playerPool";

describe("getPlayerRarityBadgeItems", () => {
  it("shows only the highest scrub tier instead of stacking scrub tags", () => {
    const superScrubId = getSuperScrubPlayerIds()[0]!;
    const player = playersById.get(superScrubId);

    expect(player).toBeDefined();

    const items = getPlayerRarityBadgeItems(player!);

    expect(items.some((item) => item.key === "super-scrub")).toBe(true);
    expect(items.some((item) => item.key === "scrub")).toBe(false);
  });

  it("shows only the highest star tier", () => {
    const superstar = players.find((player) => player.bbrPlayerId === "jokicni01");
    const tatum = players.find((player) => player.bbrPlayerId === "tatumja01");

    expect(superstar).toBeDefined();
    expect(tatum).toBeDefined();

    expect(getPlayerRarityBadgeItems(superstar!).map((item) => item.key)).toEqual([
      "superstar",
    ]);
    expect(getPlayerRarityBadgeItems(tatum!).map((item) => item.key)).toEqual([
      "superstar",
    ]);
  });

  it("returns no badges for regular players outside the scrub pool", () => {
    const scrubIds = new Set(getScrubPlayerIds());
    const superScrubIds = new Set(getSuperScrubPlayerIds());
    const regular = players.find(
      (player) =>
        !scrubIds.has(player.id) &&
        !superScrubIds.has(player.id) &&
        getPlayerRarityBadgeItems(player).length === 0,
    );

    expect(regular).toBeDefined();
    expect(getPlayerRarityBadgeItems(regular!)).toEqual([]);
  });
});
