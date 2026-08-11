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

  it("does not invent an all-wins catch-up when the season row is missing", () => {
    // priorSeasonGames=4 with no local season row — start from this match,
    // never synthesize 5-0 from games played (that produced boards like 63-1).
    expect(
      nextSeasonLeaderboardStats({
        existing: null,
        result: "win",
        priorSeasonGames: 4,
      }),
    ).toEqual({ wins: 1, losses: 0, winStreak: 1, lossStreak: 0 });
  });

  it("rebases career-leaked boards to this match only", () => {
    expect(
      nextSeasonLeaderboardStats({
        existing: { wins: 40, losses: 12, winStreak: 3, lossStreak: 0 },
        result: "loss",
        priorSeasonGames: 2,
      }),
    ).toEqual({ wins: 0, losses: 1, winStreak: 0, lossStreak: 1 });
  });

  it("advances a behind season row by one match without filling the gap", () => {
    expect(
      nextSeasonLeaderboardStats({
        existing: { wins: 2, losses: 1, winStreak: 1, lossStreak: 0 },
        result: "loss",
        priorSeasonGames: 10,
      }),
    ).toEqual({ wins: 2, losses: 2, winStreak: 0, lossStreak: 1 });
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
