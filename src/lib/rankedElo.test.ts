import { describe, expect, it } from "vitest";
import {
  calculateEloChange,
  getPlacementMultiplier,
  getStreakMultiplier,
  getTierForElo,
  RANKED_STARTING_ELO,
} from "./rankedElo";

describe("rankedElo", () => {
  it("maps elo to front office tiers", () => {
    expect(getTierForElo(250).label).toBe("Two-Way Contract");
    expect(getTierForElo(500).label).toBe("G-League GM");
    expect(getTierForElo(1200).label).toBe("NBA GM");
    expect(getTierForElo(1499).label).toBe("Top GM");
    expect(getTierForElo(1750).label).toBe("Top GM");
    expect(getTierForElo(2100).label).toBe("Generational GM");
  });

  it("gives larger swings during placement and on streaks", () => {
    const settled = calculateEloChange({
      playerElo: RANKED_STARTING_ELO,
      opponentElo: RANKED_STARTING_ELO,
      result: "win",
      rankedGamesPlayed: 10,
      activeStreak: 2,
    });
    const placement = calculateEloChange({
      playerElo: RANKED_STARTING_ELO,
      opponentElo: RANKED_STARTING_ELO,
      result: "win",
      rankedGamesPlayed: 0,
      activeStreak: 2,
    });
    const streak = calculateEloChange({
      playerElo: RANKED_STARTING_ELO,
      opponentElo: RANKED_STARTING_ELO,
      result: "win",
      rankedGamesPlayed: 10,
      activeStreak: 5,
    });

    expect(placement.delta).toBeGreaterThan(settled.delta);
    expect(streak.delta).toBeGreaterThan(settled.delta);
    expect(getPlacementMultiplier(0)).toBeGreaterThan(getPlacementMultiplier(9));
    expect(getStreakMultiplier(5)).toBeGreaterThan(getStreakMultiplier(2));
  });

  it("treats equal precise totals as a tie", () => {
    const result = calculateEloChange({
      playerElo: RANKED_STARTING_ELO,
      opponentElo: RANKED_STARTING_ELO,
      result: "tie",
      rankedGamesPlayed: 10,
      activeStreak: 4,
    });

    expect(result.delta).toBe(0);
    expect(result.nextElo).toBe(RANKED_STARTING_ELO);
  });
});
