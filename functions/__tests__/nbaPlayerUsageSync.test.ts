import { describe, expect, it } from "vitest";
import {
  emptyNbaPlayerUsageStore,
  mergeNbaPlayerUsageStore,
  normalizeNbaPlayerUsageStore,
  parseNbaPlayerUsageJson,
} from "../../src/lib/nbaPlayerUsageShared";

describe("nbaPlayerUsageSync", () => {
  it("normalizes partial usage payloads", () => {
    expect(
      normalizeNbaPlayerUsageStore({
        version: 1,
        byPlayerId: {
          "player-a": { ranked: { drafts: 1, wins: 1, losses: 0, ties: 0 } },
        },
      }),
    ).toMatchObject({
      byPlayerId: {
        "player-a": {
          ranked: { drafts: 1, wins: 1, losses: 0, ties: 0 },
        },
      },
    });
  });

  it("merges mode usage with max counters", () => {
    const left = emptyNbaPlayerUsageStore();
    left.byPlayerId["player-a"] = {
      headToHead: { drafts: 5, wins: 3, losses: 2, ties: 0 },
    };
    const right = emptyNbaPlayerUsageStore();
    right.byPlayerId["player-a"] = {
      headToHead: { drafts: 4, wins: 2, losses: 3, ties: 0 },
    };

    expect(mergeNbaPlayerUsageStore(left, right).byPlayerId["player-a"]?.headToHead).toEqual({
      drafts: 5,
      wins: 3,
      losses: 3,
      ties: 0,
    });
  });

  it("parses invalid JSON as empty usage", () => {
    expect(parseNbaPlayerUsageJson("{")).toEqual(emptyNbaPlayerUsageStore());
  });
});
