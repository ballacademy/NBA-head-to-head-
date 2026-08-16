import { describe, expect, it } from "vitest";
import {
  calculateEloChange,
  formatRatingDelta,
  formatRatingPoints,
  formatTierBannerRange,
  getClimbOutcomeMultiplier,
  getPlacementMultiplier,
  RANKED_TIERS,
  getStreakMultiplier,
  getTierForElo,
  LIVE_OPPONENT_ONLY_MIN_ELO,
  RANKED_STARTING_ELO,
  RATING_LABEL,
  requiresLiveOpponentOnly,
} from "./rankedElo";

describe("rankedElo", () => {
  it("maps elo to front office tiers", () => {
    expect(getTierForElo(250).label).toBe("Tank Commander");
    expect(getTierForElo(500).label).toBe("G-League GM");
    expect(getTierForElo(1200).label).toBe("NBA GM");
    expect(getTierForElo(1499).label).toBe("NBA GM");
    expect(getTierForElo(1500).label).toBe("Top GM");
    expect(getTierForElo(1750).label).toBe("Top GM");
    expect(getTierForElo(1999).label).toBe("Top GM");
    expect(getTierForElo(2000).label).toBe("Generational GM");
    expect(getTierForElo(2100).label).toBe("Generational GM");
  });

  it("formats rating points for player-facing copy", () => {
    expect(formatRatingPoints(1200)).toBe("1200 Banners");
    expect(formatRatingDelta(12)).toBe("+12 Banners");
    expect(formatRatingDelta(-8)).toBe("-8 Banners");
    expect(RATING_LABEL).toBe("Banners");
    expect(requiresLiveOpponentOnly(LIVE_OPPONENT_ONLY_MIN_ELO)).toBe(true);
  });

  it("formats tier banner ranges", () => {
    expect(formatTierBannerRange(RANKED_TIERS[0]!)).toBe("0–499 Banners");
    expect(formatTierBannerRange(RANKED_TIERS[1]!)).toBe("500–999 Banners");
    expect(formatTierBannerRange(RANKED_TIERS[2]!)).toBe("1000–1499 Banners");
    expect(formatTierBannerRange(RANKED_TIERS[3]!)).toBe("1500–1999 Banners");
    expect(formatTierBannerRange(RANKED_TIERS[4]!)).toBe("2000+ Banners");
  });

  it("eases banner climb below Generational GM", () => {
    expect(getClimbOutcomeMultiplier(250, "win")).toBeGreaterThan(
      getClimbOutcomeMultiplier(250, "loss"),
    );
    expect(getClimbOutcomeMultiplier(250, "win")).toBeGreaterThan(
      getClimbOutcomeMultiplier(750, "win"),
    );
    expect(getClimbOutcomeMultiplier(750, "win")).toBeGreaterThan(
      getClimbOutcomeMultiplier(1200, "win"),
    );
    expect(getClimbOutcomeMultiplier(1200, "win")).toBeGreaterThan(
      getClimbOutcomeMultiplier(1700, "win"),
    );
    expect(getClimbOutcomeMultiplier(1700, "win")).toBeGreaterThan(
      getClimbOutcomeMultiplier(2100, "win"),
    );
    expect(getClimbOutcomeMultiplier(2100, "win")).toBe(1);
    expect(getClimbOutcomeMultiplier(2100, "loss")).toBe(1);
    expect(getClimbOutcomeMultiplier(1200, "tie")).toBe(1);
  });

  it("awards more banners on equal wins than it docks on equal losses until 2000", () => {
    const settledEqual = (elo: number, result: "win" | "loss") =>
      calculateEloChange({
        playerElo: elo,
        opponentElo: elo,
        result,
        rankedGamesPlayed: 10,
        activeStreak: 0,
      });

    for (const elo of [250, 750, 1200, 1700]) {
      const win = settledEqual(elo, "win");
      const loss = settledEqual(elo, "loss");
      expect(win.delta).toBeGreaterThan(Math.abs(loss.delta));
    }

    const generationalWin = settledEqual(2100, "win");
    const generationalLoss = settledEqual(2100, "loss");
    expect(generationalWin.delta).toBe(Math.abs(generationalLoss.delta));
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

  it("keeps streak multipliers on losses while climb softens the dock", () => {
    const baseLoss = calculateEloChange({
      playerElo: 750,
      opponentElo: 750,
      result: "loss",
      rankedGamesPlayed: 10,
      activeStreak: 0,
    });
    const streakLoss = calculateEloChange({
      playerElo: 750,
      opponentElo: 750,
      result: "loss",
      rankedGamesPlayed: 10,
      activeStreak: 5,
    });

    expect(Math.abs(streakLoss.delta)).toBeGreaterThan(Math.abs(baseLoss.delta));
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
