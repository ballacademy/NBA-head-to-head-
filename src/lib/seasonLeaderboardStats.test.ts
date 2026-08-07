import { describe, expect, it } from "vitest";
import { nextSeasonLeaderboardStats } from "./seasonLeaderboardStats";

describe("nextSeasonLeaderboardStats", () => {
  it("starts a fresh season board at 1-0 / 0-1", () => {
    expect(
      nextSeasonLeaderboardStats({
        existing: null,
        result: "win",
        priorSeasonGames: 0,
      }),
    ).toEqual({ wins: 1, losses: 0, winStreak: 1, lossStreak: 0 });

    expect(
      nextSeasonLeaderboardStats({
        existing: null,
        result: "loss",
        priorSeasonGames: 0,
      }),
    ).toEqual({ wins: 0, losses: 1, winStreak: 0, lossStreak: 1 });
  });

  it("increments an in-sync season row by one match", () => {
    expect(
      nextSeasonLeaderboardStats({
        existing: { wins: 2, losses: 1, winStreak: 2, lossStreak: 0 },
        result: "win",
        priorSeasonGames: 3,
      }),
    ).toEqual({ wins: 3, losses: 1, winStreak: 3, lossStreak: 0 });

    expect(
      nextSeasonLeaderboardStats({
        existing: { wins: 2, losses: 1, winStreak: 2, lossStreak: 0 },
        result: "loss",
        priorSeasonGames: 3,
      }),
    ).toEqual({ wins: 2, losses: 2, winStreak: 0, lossStreak: 1 });
  });

  it("does not post career totals when the season row is missing mid-season", () => {
    // priorSeasonGames=4 with no local season row — catch-up synthesize,
    // not career modeRecords (e.g. 40-12).
    expect(
      nextSeasonLeaderboardStats({
        existing: null,
        result: "win",
        priorSeasonGames: 4,
      }),
    ).toEqual({ wins: 5, losses: 0, winStreak: 5, lossStreak: 0 });
  });

  it("rebases when career stats leaked into the season board", () => {
    expect(
      nextSeasonLeaderboardStats({
        existing: { wins: 40, losses: 12, winStreak: 3, lossStreak: 0 },
        result: "loss",
        priorSeasonGames: 2,
      }),
    ).toEqual({ wins: 0, losses: 3, winStreak: 0, lossStreak: 3 });
  });

  it("keeps record unchanged on ties when in sync", () => {
    expect(
      nextSeasonLeaderboardStats({
        existing: { wins: 1, losses: 1, winStreak: 0, lossStreak: 1 },
        result: "tie",
        priorSeasonGames: 2,
      }),
    ).toEqual({ wins: 1, losses: 1, winStreak: 0, lossStreak: 1 });
  });

  it("can update W-L without changing streaks", () => {
    expect(
      nextSeasonLeaderboardStats({
        existing: { wins: 2, losses: 1, winStreak: 2, lossStreak: 0 },
        result: "loss",
        priorSeasonGames: 3,
        countTowardStreak: false,
      }),
    ).toEqual({ wins: 2, losses: 2, winStreak: 2, lossStreak: 0 });

    expect(
      nextSeasonLeaderboardStats({
        existing: null,
        result: "win",
        priorSeasonGames: 0,
        countTowardStreak: false,
      }),
    ).toEqual({ wins: 1, losses: 0, winStreak: 0, lossStreak: 0 });
  });
});
