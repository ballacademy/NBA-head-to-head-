import { describe, expect, it } from "vitest";
import { validateLeaderboardUpsert } from "../lib/leaderboardUpsert";

describe("validateLeaderboardUpsert", () => {
  it("allows a fresh 0-0 season seed", () => {
    expect(
      validateLeaderboardUpsert(
        "classic",
        {
          elo: 500,
          wins: 0,
          losses: 0,
          winStreak: 0,
          lossStreak: 0,
        },
        null,
      ),
    ).toBeNull();
  });

  it("allows a first match insert", () => {
    expect(
      validateLeaderboardUpsert(
        "classic",
        {
          elo: 520,
          wins: 1,
          losses: 0,
          winStreak: 1,
          lossStreak: 0,
        },
        null,
      ),
    ).toBeNull();
  });

  it("rejects multi-game first inserts that used to poison boards", () => {
    expect(
      validateLeaderboardUpsert(
        "classic",
        {
          elo: 560,
          wins: 3,
          losses: 1,
          winStreak: 2,
          lossStreak: 0,
        },
        null,
      ),
    ).toMatch(/single match/);

    expect(
      validateLeaderboardUpsert(
        "classic",
        {
          elo: 900,
          wins: 63,
          losses: 0,
          winStreak: 63,
          lossStreak: 0,
        },
        null,
      ),
    ).toMatch(/single match/);
  });

  it("rejects catch-up inserts with impossible elo for the game count", () => {
    expect(
      validateLeaderboardUpsert(
        "classic",
        {
          elo: 2000,
          wins: 2,
          losses: 0,
          winStreak: 2,
          lossStreak: 0,
        },
        null,
      ),
    ).toMatch(/single match|elo change exceeds/);
  });

  it("still enforces one-match deltas on updates", () => {
    expect(
      validateLeaderboardUpsert(
        "classic",
        {
          elo: 540,
          wins: 5,
          losses: 1,
          winStreak: 3,
          lossStreak: 0,
        },
        {
          elo: 520,
          wins: 2,
          losses: 1,
          win_streak: 1,
          loss_streak: 0,
        },
      ),
    ).toMatch(/record change exceeds one match/);
  });

  it("allows streak-frozen W-L updates for stored-lineup owner results", () => {
    expect(
      validateLeaderboardUpsert(
        "classic",
        {
          elo: 530,
          wins: 3,
          losses: 1,
          winStreak: 2,
          lossStreak: 0,
        },
        {
          elo: 520,
          wins: 2,
          losses: 1,
          win_streak: 2,
          loss_streak: 0,
        },
      ),
    ).toBeNull();

    expect(
      validateLeaderboardUpsert(
        "ranked",
        {
          elo: 510,
          wins: 2,
          losses: 2,
          winStreak: 2,
          lossStreak: 0,
        },
        {
          elo: 520,
          wins: 2,
          losses: 1,
          win_streak: 2,
          loss_streak: 0,
        },
      ),
    ).toBeNull();
  });

  it("allows a streak-frozen first-match insert", () => {
    expect(
      validateLeaderboardUpsert(
        "classic",
        {
          elo: 520,
          wins: 1,
          losses: 0,
          winStreak: 0,
          lossStreak: 0,
        },
        null,
      ),
    ).toBeNull();
  });
});
