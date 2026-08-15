import { describe, expect, it } from "vitest";
import {
  filterUnlockedIds,
  unionUnlockedIds,
} from "../lib/collectionSync";
import { getWinUnlockPlayerIds } from "../../src/lib/allStars";
import { players } from "../../src/lib/playerPool";
import {
  getScrubPlayerIds,
  isScrubPlayer,
  SCRUB_POOL_EXCLUDED_BBR_IDS,
} from "../../src/lib/playerTiers";

describe("collectionSync", () => {
  it("filters unknown and duplicate unlock ids", () => {
    const validWin = getWinUnlockPlayerIds()[0]!;
    const validScrub = getScrubPlayerIds()[0]!;

    expect(
      filterUnlockedIds([validWin, "not-a-player", validWin, validScrub, 12]),
    ).toEqual([validWin, validScrub]);
  });

  it("unions unlock lists without duplicates", () => {
    const [a, b] = getWinUnlockPlayerIds();
    const [c] = getScrubPlayerIds();

    expect(unionUnlockedIds([a!, b!], [b!, c!], ["bogus"])).toEqual([
      a!,
      b!,
      c!,
    ]);
  });

  it("preserves former scrub unlock ids that left the current pool", () => {
    const former = players.find(
      (player) =>
        player.bbrPlayerId &&
        (SCRUB_POOL_EXCLUDED_BBR_IDS as readonly string[]).includes(
          player.bbrPlayerId,
        ),
    );
    expect(former).toBeDefined();
    expect(isScrubPlayer(former!)).toBe(false);

    const validScrub = getScrubPlayerIds()[0]!;
    expect(
      filterUnlockedIds([former!.id, validScrub, "not-a-player"]),
    ).toEqual([former!.id, validScrub]);
  });
});
