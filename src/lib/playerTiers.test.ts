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
import type { Player } from "./types";

const buildGreedyLineup = (direction: "min" | "max") => {
  const picked: Player[] = [];
  const pickedIds = new Set<string>();

  for (let index = 0; index < 5; index += 1) {
    let selection: Player | null = null;
    let selectionScore =
      direction === "min" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    for (const candidate of players) {
      if (pickedIds.has(candidate.id)) {
        continue;
      }

      const score = calculateLineupScore([...picked, candidate]).preciseTotal;

      if (
        direction === "min"
          ? score < selectionScore
          : score > selectionScore
      ) {
        selectionScore = score;
        selection = candidate;
      }
    }

    expect(selection).not.toBeNull();
    picked.push(selection!);
    pickedIds.add(selection!.id);
  }

  return picked;
};

describe("playerTiers", () => {
  it("defines 30 scrubs with the worst 6 marked as super scrubs", () => {
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

  it("keeps Jonathan Isaac and Pat Connaughton out of the scrub pool", () => {
    const isaac = players.find((player) => player.bbrPlayerId === "isaacjo01");
    const connaughton = players.find(
      (player) => player.bbrPlayerId === "connapa01",
    );

    expect(isaac).toBeDefined();
    expect(connaughton).toBeDefined();
    expect(isScrubPlayer(isaac!)).toBe(false);
    expect(isScrubPlayer(connaughton!)).toBe(false);
    expect(getScrubPlayerIds()).toHaveLength(SCRUB_POOL_SIZE);
  });

  it("includes the curated scrub pool members", () => {
    const ajJohnson = players.find((player) => player.bbrPlayerId === "johnsaj01");
    const adouThiero = players.find((player) => player.bbrPlayerId === "thierad01");

    expect(ajJohnson).toBeDefined();
    expect(adouThiero).toBeDefined();
    expect(isScrubPlayer(ajJohnson!)).toBe(true);
    expect(isScrubPlayer(adouThiero!)).toBe(true);
    expect(getScrubPlayerIds()).toHaveLength(SCRUB_POOL_SIZE);
  });

  it("excludes manual scrub-pool overrides and backfills the next-worst players", () => {
    const looney = players.find((player) => player.bbrPlayerId === "looneke01");
    const adams = players.find((player) => player.bbrPlayerId === "adamsst01");
    const martin = players.find((player) => player.bbrPlayerId === "martica02");
    const russell = players.find((player) => player.bbrPlayerId === "russeda01");
    const jackson = players.find(
      (player) => player.name === "Andre Jackson Jr.",
    );

    expect(looney).toBeDefined();
    expect(adams).toBeDefined();
    expect(martin).toBeDefined();
    expect(russell).toBeDefined();
    expect(jackson).toBeDefined();
    expect(isScrubPlayer(looney!)).toBe(false);
    expect(isScrubPlayer(adams!)).toBe(false);
    expect(isScrubPlayer(martin!)).toBe(false);
    expect(isScrubPlayer(russell!)).toBe(false);
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
    const worstRecord = calculateLineupScore(worstLineup).projectedRecord;
    const greedyWorstRecord = calculateLineupScore(buildGreedyLineup("min"))
      .projectedRecord;
    const greedyBestRecord = calculateLineupScore(buildGreedyLineup("max"))
      .projectedRecord;

    expect(worstRecord.formatted).toBe("Record: 0-82");
    expect(greedyWorstRecord.formatted).toBe("Record: 0-82");
    expect(greedyBestRecord.formatted).toBe("Record: 82-0");
    expect(worstRecord.wins + worstRecord.losses).toBe(SEASON_LENGTH);
    expect(greedyBestRecord.wins + greedyBestRecord.losses).toBe(SEASON_LENGTH);
    expect(projectRecord(0).formatted).toBe("Record: 0-82");
    expect(projectRecord(100).formatted).toBe("Record: 82-0");
  });
});
