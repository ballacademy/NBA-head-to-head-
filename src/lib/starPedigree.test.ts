import { describe, expect, it } from "vitest";
import { getAllEraPlayers } from "./eraPlayers";
import { hasStarPedigree, isAllStarTierPlayer, isSuperstarTierPlayer } from "./starPedigree";
import { checkLineupAchievements } from "./achievements";

describe("starPedigree", () => {
  it("treats era legends as star pedigree", () => {
    const legend = getAllEraPlayers()[0];

    expect(legend).toBeDefined();
    expect(hasStarPedigree(legend!)).toBe(true);
    expect(isAllStarTierPlayer(legend!)).toBe(true);
    expect(isSuperstarTierPlayer(legend!)).toBe(true);
  });

  it("does not award No Votes for an all-legend lineup", () => {
    const lineup = getAllEraPlayers().slice(0, 5);

    expect(lineup).toHaveLength(5);
    expect(checkLineupAchievements(lineup)).not.toContain("no-votes");
    expect(checkLineupAchievements(lineup)).toContain("five-superstars");
  });
});
