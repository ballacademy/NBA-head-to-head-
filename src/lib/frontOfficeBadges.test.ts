import { describe, expect, it } from "vitest";
import {
  formatLegacyMonthlyFinish,
  formatLegacyPeakBanners,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
  getUnlockedFrontOfficeBadges,
} from "./frontOfficeBadges";

describe("frontOfficeBadges", () => {
  it("formats legacy monthly finish and peak banners", () => {
    expect(formatLegacyMonthlyFinish(3, "2026-06")).toMatch(/^#3 in /);
    expect(formatLegacyMonthlyFinish(null, "2026-06")).toBe(
      "No ranked finish yet",
    );
    expect(formatLegacyPeakBannerCount(1520)).toBe("1520 Banners");
    expect(formatLegacyPeakBannerTier(1520)).toBe("Top GM");
    expect(formatLegacyPeakBanners(1520)).toContain("1520 Banners");
    expect(formatLegacyPeakBanners(1520)).toContain("Top GM");
  });

  it("unlocks front office badges by peak elo", () => {
    expect(getUnlockedFrontOfficeBadges(499)).toHaveLength(1);
    expect(getUnlockedFrontOfficeBadges(1500)).toHaveLength(4);
    expect(getUnlockedFrontOfficeBadges(2100)).toHaveLength(5);
  });
});
