import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { playersById } from "./playerPool";
import {
  ALL_STAR_LINEUP_BONUS,
  getLineupTierAdjustment,
  getScrubTierLineupPenalty,
  getStarTierLineupBonus,
  RECENT_ALL_STAR_LINEUP_BONUS,
  SCRUB_LINEUP_PENALTY,
  SUPER_SCRUB_LINEUP_PENALTY,
  SUPERSTAR_LINEUP_BONUS,
} from "./lineupMatchupBonus";
import { getScrubPlayerIds, getSuperScrubPlayerIds } from "./playerTiers";

describe("getStarTierLineupBonus", () => {
  it("applies the highest tier bonus once per player", () => {
    const byId = new Map(players.map((player) => [player.id, player]));
    const lineup = [
      byId.get("jokicni01-den"),
      byId.get("bookede01-pho"),
      byId.get("garlada01-cle"),
    ].filter((player): player is NonNullable<typeof player> => Boolean(player));

    expect(lineup).toHaveLength(3);
    expect(getStarTierLineupBonus(lineup)).toBe(
      SUPERSTAR_LINEUP_BONUS +
        ALL_STAR_LINEUP_BONUS +
        RECENT_ALL_STAR_LINEUP_BONUS,
    );
  });
});

describe("getScrubTierLineupPenalty", () => {
  it("applies the highest scrub penalty once per player", () => {
    const superScrubIds = new Set(getSuperScrubPlayerIds());
    const scrubOnlyId = getScrubPlayerIds().find((id) => !superScrubIds.has(id));
    const scrub = scrubOnlyId ? playersById.get(scrubOnlyId) : undefined;
    const superScrub = playersById.get(getSuperScrubPlayerIds()[0]!);

    expect(scrub).toBeDefined();
    expect(superScrub).toBeDefined();

    expect(getScrubTierLineupPenalty([scrub!, superScrub!])).toBe(
      SCRUB_LINEUP_PENALTY + SUPER_SCRUB_LINEUP_PENALTY,
    );
    expect(getLineupTierAdjustment([scrub!, superScrub!])).toBe(
      SCRUB_LINEUP_PENALTY + SUPER_SCRUB_LINEUP_PENALTY,
    );
  });
});
