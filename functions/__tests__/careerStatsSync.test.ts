import { describe, expect, it } from "vitest";
import {
  emptyCareerStats,
  mergeCareerStats,
  normalizeCareerStats,
  parseCareerJson,
} from "../../src/lib/careerStatsShared";

describe("careerStatsSync", () => {
  it("normalizes partial career payloads", () => {
    expect(
      normalizeCareerStats({
        modes: {
          headToHead: { wins: 4.2, losses: -1 },
          ranked: { wins: 2 },
        },
        allTimeBanners: { elo: 800, peakElo: 700, gamesPlayed: 3 },
      }),
    ).toEqual({
      modes: {
        headToHead: {
          wins: 4,
          losses: 0,
          ties: 0,
          winStreak: 0,
          lossStreak: 0,
        },
        ranked: {
          wins: 2,
          losses: 0,
          ties: 0,
          winStreak: 0,
          lossStreak: 0,
        },
        allTime: {
          wins: 0,
          losses: 0,
          ties: 0,
          winStreak: 0,
          lossStreak: 0,
        },
      },
      allTimeBanners: { elo: 800, peakElo: 800, gamesPlayed: 3 },
    });
  });

  it("merges mode records with max counters", () => {
    const left = emptyCareerStats();
    left.modes.headToHead = {
      wins: 10,
      losses: 2,
      ties: 1,
      winStreak: 3,
      lossStreak: 0,
    };
    const right = emptyCareerStats();
    right.modes.headToHead = {
      wins: 8,
      losses: 5,
      ties: 0,
      winStreak: 1,
      lossStreak: 2,
    };

    expect(mergeCareerStats(left, right).modes.headToHead).toEqual({
      wins: 10,
      losses: 5,
      ties: 1,
      winStreak: 3,
      lossStreak: 2,
    });
  });

  it("prefers the more-played All-Time banners for current elo", () => {
    const left = emptyCareerStats();
    left.allTimeBanners = { elo: 700, peakElo: 900, gamesPlayed: 12 };
    const right = emptyCareerStats();
    right.allTimeBanners = { elo: 850, peakElo: 850, gamesPlayed: 4 };

    expect(mergeCareerStats(left, right).allTimeBanners).toEqual({
      elo: 700,
      peakElo: 900,
      gamesPlayed: 12,
    });
  });

  it("parses invalid JSON as empty career stats", () => {
    expect(parseCareerJson("not-json")).toEqual(emptyCareerStats());
  });
});
