import { describe, expect, it } from "vitest";
import {
  filterUnlockedIds,
  unionUnlockedIds,
} from "../lib/collectionSync";
import { getWinUnlockPlayerIds } from "../../src/lib/allStars";
import { getScrubPlayerIds } from "../../src/lib/playerTiers";

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
});
