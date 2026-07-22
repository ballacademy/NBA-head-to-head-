import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { playersById } from "./playerPool";
import {
  ALL_STAR_LINEUP_BONUS,
  getImpactDepthLineupBonus,
  getImpactRankLineupBonus,
  getLineupStarBonus,
  getLineupTierAdjustment,
  getPlayerImpactRankLineupBonus,
  getPlayerLineupStarBonus,
  getPlayerTaggedStarTierBonus,
  getScrubTierLineupPenalty,
  getStarTierLineupBonus,
  IMPACT_RANK_DEPTH_BONUS_PER_PLAYER,
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
    expect(getPlayerLineupStarBonus(butler!)).toBeGreaterThan(1.5);
    expect(getPlayerLineupStarBonus(butler!)).toBeLessThan(
      IMPACT_RANK_TOP_BONUS,
    );
  });

  it("uses the higher of tag credit or impact rank credit without double-counting", () => {
    const kat = playersById.get("townska01-nyk");
    const butler = playersById.get("butleji01-gsw");

    expect(kat && butler).toBeTruthy();
    expect(getPlayerTaggedStarTierBonus(kat!)).toBe(ALL_STAR_LINEUP_BONUS);
    expect(getPlayerImpactRankLineupBonus(kat!)).toBeGreaterThan(
      ALL_STAR_LINEUP_BONUS,
    );
    expect(getPlayerLineupStarBonus(kat!)).toBe(
      getPlayerImpactRankLineupBonus(kat!),
    );
    expect(getPlayerLineupStarBonus(kat!)).toBeGreaterThan(
      getPlayerLineupStarBonus(butler!),
    );
    expect(getImpactRankLineupBonus([kat!])).toBeGreaterThan(0);
    expect(getLineupStarBonus([kat!])).toBe(getPlayerLineupStarBonus(kat!));
  });

  it("applies diminishing boosts through the top 100 impact players", () => {
    const castle = playersById.get("castlst01-sas");
    const amen = playersById.get("thompam01-hou");
    const giddey = players.find((player) => player.bbrPlayerId === "giddejo01");
    const unranked = players.find(
      (player) => getPlayerImpactRank(player) === null,
    );

    expect(castle && amen && giddey && unranked).toBeTruthy();
    expect(getPlayerLineupStarBonus(castle!)).toBeGreaterThan(
      getPlayerLineupStarBonus(amen!),
    );
    expect(getPlayerLineupStarBonus(amen!)).toBeGreaterThan(
      getPlayerLineupStarBonus(giddey!),
    );
    expect(getPlayerLineupStarBonus(giddey!)).toBeGreaterThan(
      IMPACT_RANK_FLOOR_BONUS,
    );
    expect(getPlayerLineupStarBonus(unranked!)).toBe(0);
  });

  it("folds unified star boosts into lineup tier adjustments", () => {
    const lineup = [
      playersById.get("butleji01-gsw"),
      playersById.get("castlst01-sas"),
      playersById.get("thompam01-hou"),
    ].filter((player): player is NonNullable<typeof player> => Boolean(player));

    expect(getLineupTierAdjustment(lineup)).toBe(
      getLineupStarBonus(lineup) + getImpactDepthLineupBonus(lineup),
    );
  });

  it("rewards top-100 impact depth so fuller talent lineups climb", () => {
    const deep = [
      players.find((player) => player.bbrPlayerId === "giddejo01"),
      players.find((player) => player.bbrPlayerId === "holidjr01"),
      players.find((player) => player.bbrPlayerId === "thompau01"),
      players.find((player) => player.bbrPlayerId === "adebaba01"),
      players.find((player) => player.bbrPlayerId === "reidna01"),
    ].filter((player): player is NonNullable<typeof player> => Boolean(player));
    const thin = [
      players.find((player) => player.bbrPlayerId === "hardyja02"),
      players.find((player) => player.bbrPlayerId === "banede01"),
      players.find((player) => player.bbrPlayerId === "portibo01"),
      players.find((player) => player.bbrPlayerId === "reidna01"),
      players.find((player) => player.bbrPlayerId === "embiijo01"),
    ].filter((player): player is NonNullable<typeof player> => Boolean(player));

    expect(deep).toHaveLength(5);
    expect(thin).toHaveLength(5);
    expect(getImpactDepthLineupBonus(deep)).toBe(IMPACT_RANK_DEPTH_BONUS_PER_PLAYER * 5);
    expect(getImpactDepthLineupBonus(thin)).toBe(IMPACT_RANK_DEPTH_BONUS_PER_PLAYER * 3);
    expect(getLineupTierAdjustment(deep)).toBeGreaterThan(
      getLineupTierAdjustment(thin),
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
