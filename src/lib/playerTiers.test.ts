import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  getScrubPlayerIds,
  getSuperScrubPlayerIds,
  isScrubPlayer,
  isSuperScrubPlayer,
  SCRUB_POOL_SIZE,
  SUPER_SCRUB_POOL_SIZE,
} from "./playerTiers";
import { playersById } from "./playerPool";
import { getStarTierLineupBonus } from "./lineupMatchupBonus";
import {
  calculateLineupScore,
  calculateLineupStatRawTotal,
  normalizeLineupTotal,
  projectRecord,
  SEASON_LENGTH,
} from "./scoring";

describe("playerTiers", () => {
  it("defines 50 scrubs with the worst 10 marked as super scrubs", () => {
    const scrubIds = getScrubPlayerIds();
    const superScrubIds = getSuperScrubPlayerIds();

    expect(scrubIds).toHaveLength(SCRUB_POOL_SIZE);
    expect(superScrubIds).toHaveLength(SUPER_SCRUB_POOL_SIZE);
    expect(new Set(scrubIds).size).toBe(SCRUB_POOL_SIZE);
    expect(new Set(superScrubIds).size).toBe(SUPER_SCRUB_POOL_SIZE);

    superScrubIds.forEach((playerId) => {
      expect(scrubIds).toContain(playerId);
    });
  });

  it("flags scrub tiers on player lookups", () => {
    const scrubId = getScrubPlayerIds()[0]!;
    const superScrubId = getSuperScrubPlayerIds()[0]!;
    const scrub = playersById.get(scrubId);
    const superScrub = playersById.get(superScrubId);

    expect(scrub).toBeDefined();
    expect(superScrub).toBeDefined();
    expect(isScrubPlayer(scrub!)).toBe(true);
    expect(isSuperScrubPlayer(superScrub!)).toBe(true);
    expect(isSuperScrubPlayer(scrub!)).toBe(
      getSuperScrubPlayerIds().includes(scrubId),
    );
  });

  it("excludes Bradley Beal from the scrub pool and backfills the next-worst player", () => {
    const beal = players.find((player) => player.bbrPlayerId === "bealbr01");
    const jackson = players.find(
      (player) => player.name === "Andre Jackson Jr.",
    );

    expect(beal).toBeDefined();
    expect(jackson).toBeDefined();
    expect(isScrubPlayer(beal!)).toBe(false);
    expect(isScrubPlayer(jackson!)).toBe(true);
    expect(getScrubPlayerIds()).toHaveLength(SCRUB_POOL_SIZE);
  });

  it("supports 0-82 and 82-0 projected records from real player pools", () => {
    const ranked = [...players]
      .map((player) => ({
        player,
        ovr: normalizeLineupTotal(
          calculateLineupStatRawTotal([player]) +
            getStarTierLineupBonus([player]),
        ),
      }))
      .sort(
        (left, right) =>
          left.ovr - right.ovr ||
          left.player.name.localeCompare(right.player.name),
      );

    const worstLineup = ranked.slice(0, 5).map((entry) => entry.player);
    const bestLineup = ranked.slice(-5).map((entry) => entry.player);
    const worstRecord = calculateLineupScore(worstLineup).projectedRecord;
    const bestRecord = calculateLineupScore(bestLineup).projectedRecord;

    expect(worstRecord.formatted).toBe("Record: 0-82");
    expect(bestRecord.wins).toBeGreaterThanOrEqual(55);
    expect(worstRecord.wins + worstRecord.losses).toBe(SEASON_LENGTH);
    expect(bestRecord.wins + bestRecord.losses).toBe(SEASON_LENGTH);
    expect(projectRecord(0).formatted).toBe("Record: 0-82");
    expect(projectRecord(100).formatted).toBe("Record: 82-0");
  });
});
