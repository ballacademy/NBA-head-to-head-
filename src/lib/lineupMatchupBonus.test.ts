import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { playersById } from "./playerPool";
import {
  ALL_STAR_LINEUP_BONUS,
  getImpactRankLineupBonus,
  getLineupTierAdjustment,
  getPlayerImpactRankLineupBonus,
  getScrubTierLineupPenalty,
  getStarTierLineupBonus,
  IMPACT_RANK_FLOOR_BONUS,
  IMPACT_RANK_TOP_BONUS,
  RECENT_ALL_STAR_LINEUP_BONUS,
  SCRUB_LINEUP_PENALTY,
  SUPER_SCRUB_LINEUP_PENALTY,
  SUPERSTAR_LINEUP_BONUS,
} from "./lineupMatchupBonus";
import { getPlayerImpactRank } from "./impactRanking";
import { getScrubPlayerIds, getSuperScrubPlayerIds } from "./playerTiers";

describe("getStarTierLineupBonus", () => {
  it("applies the highest tier bonus once per player", () => {
    const lineup = [
      playersById.get("jokicni01-den"),
      playersById.get("bookede01-pho"),
      [...playersById.values()].find((player) => player.bbrPlayerId === "garlada01"),
    ].filter((player): player is NonNullable<typeof player> => Boolean(player));

    expect(lineup).toHaveLength(3);
    expect(getStarTierLineupBonus(lineup)).toBe(
      SUPERSTAR_LINEUP_BONUS +
        ALL_STAR_LINEUP_BONUS +
        RECENT_ALL_STAR_LINEUP_BONUS,
    );
  });
});

describe("getImpactRankLineupBonus", () => {
  it("grants a top-tier boost to impact-ranked stars missing all-star tags", () => {
    const butler = playersById.get("butleji01-gsw");

    expect(butler).toBeDefined();
    expect(getPlayerImpactRank(butler!)).toBe(24);
    expect(getPlayerImpactRankLineupBonus(butler!)).toBeGreaterThan(1.5);
    expect(getPlayerImpactRankLineupBonus(butler!)).toBeLessThan(
      IMPACT_RANK_TOP_BONUS,
    );
  });

  it("does not stack impact rank boosts on players already receiving star tier credit", () => {
    const kat = playersById.get("townska01-nyk");

    expect(kat).toBeDefined();
    expect(getPlayerImpactRank(kat!)).toBeLessThanOrEqual(30);
    expect(getStarTierLineupBonus([kat!])).toBe(ALL_STAR_LINEUP_BONUS);
    expect(getPlayerImpactRankLineupBonus(kat!)).toBe(0);
  });

  it("applies diminishing boosts through the top 75 impact players", () => {
    const castle = playersById.get("castlst01-sas");
    const amen = playersById.get("thompam01-hou");
    const pritchard = playersById.get("pritcpa01-bos");

    expect(castle && amen && pritchard).toBeTruthy();
    expect(getPlayerImpactRankLineupBonus(castle!)).toBeGreaterThan(
      getPlayerImpactRankLineupBonus(amen!),
    );
    expect(getPlayerImpactRankLineupBonus(amen!)).toBeGreaterThan(
      IMPACT_RANK_FLOOR_BONUS,
    );
    expect(getPlayerImpactRankLineupBonus(pritchard!)).toBe(0);
  });

  it("folds impact rank boosts into lineup tier adjustments", () => {
    const lineup = [
      playersById.get("butleji01-gsw"),
      playersById.get("castlst01-sas"),
      playersById.get("thompam01-hou"),
    ].filter((player): player is NonNullable<typeof player> => Boolean(player));

    expect(getLineupTierAdjustment(lineup)).toBe(
      getImpactRankLineupBonus(lineup),
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
