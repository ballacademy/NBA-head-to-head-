import { describe, expect, it } from "vitest";
import {
  getScrubPlayerIds,
  getSuperScrubPlayerIds,
  isScrubPlayer,
  isSuperScrubPlayer,
  SCRUB_POOL_SIZE,
  SUPER_SCRUB_POOL_SIZE,
} from "./playerTiers";
import { playersById } from "./playerPool";

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
});
