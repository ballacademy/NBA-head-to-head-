import { describe, expect, it } from "vitest";
import {
  emptyNbaPlayerUsageStore,
  mergeNbaPlayerUsageStore,
  normalizeNbaPlayerUsageStore,
  parseNbaPlayerUsageJson,
} from "./nbaPlayerUsageShared";

describe("nbaPlayerUsageShared", () => {
  it("normalizes partial usage payloads", () => {
    expect(
      normalizeNbaPlayerUsageStore({
        version: 1,
        byPlayerId: {
          "player-a": {
            headToHead: { drafts: 2.8, wins: 1, losses: -1, ties: 0 },
          },
        },
        recordedKeys: ["match-1", "", 42],
      }),
    ).toMatchObject({
      version: 1,
      byPlayerId: {
        "player-a": {
          headToHead: { drafts: 3, wins: 1, losses: 0, ties: 0 },
        },
      },
      recordedKeys: ["match-1"],
    });
  });

  it("merges usage with max counters and union keys", () => {
    const left = emptyNbaPlayerUsageStore();
    left.byPlayerId["player-a"] = {
      headToHead: { drafts: 3, wins: 2, losses: 1, ties: 0 },
    };
    left.recordedKeys = ["match-1", "match-2"];

    const right = emptyNbaPlayerUsageStore();
    right.byPlayerId["player-a"] = {
      headToHead: { drafts: 2, wins: 1, losses: 2, ties: 0 },
      ranked: { drafts: 4, wins: 3, losses: 1, ties: 0 },
    };
    right.recordedKeys = ["match-2", "match-3"];

    const merged = mergeNbaPlayerUsageStore(left, right);
    expect(merged.byPlayerId["player-a"]?.headToHead).toEqual({
      drafts: 3,
      wins: 2,
      losses: 2,
      ties: 0,
    });
    expect(merged.byPlayerId["player-a"]?.ranked).toEqual({
      drafts: 4,
      wins: 3,
      losses: 1,
      ties: 0,
    });
    expect(merged.recordedKeys).toEqual(["match-1", "match-2", "match-3"]);
  });

  it("parses invalid JSON as empty usage", () => {
    expect(parseNbaPlayerUsageJson("not-json")).toEqual(emptyNbaPlayerUsageStore());
  });
});
