import { describe, expect, it } from "vitest";
import {
  calculateEloChange,
  formatRatingDelta,
  formatRatingPoints,
  formatTierBannerRange,
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
    expect(getTierForElo(250).label).toBe("Two-Way Contract");
    expect(getTierForElo(500).label).toBe("G-League GM");
    expect(getTierForElo(1200).label).toBe("NBA GM");
    expect(getTierForElo(1499).label).toBe("Top GM");
    expect(getTierForElo(1750).label).toBe("Top GM");
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
    expect(formatTierBannerRange(RANKED_TIERS[2]!)).toBe("1000–1498 Banners");
    expect(formatTierBannerRange(RANKED_TIERS[3]!)).toBe("1499–2000 Banners");
    expect(formatTierBannerRange(RANKED_TIERS[4]!)).toBe("2001+ Banners");
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
