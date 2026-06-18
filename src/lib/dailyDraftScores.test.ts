import { describe, expect, it } from "vitest";
import { computePercentile, formatDailyPercentile } from "./dailyDraftScores";

describe("dailyDraftScores", () => {
  it("computes percentile rank against a score distribution", () => {
    const values = [40, 50, 60, 70, 80];
    expect(computePercentile(40, values)).toBe(10);
    expect(computePercentile(80, values)).toBe(90);
    expect(computePercentile(60, values)).toBe(50);
  });

  it("formats percentile copy for the results screen", () => {
    expect(
      formatDailyPercentile({ percentile: 92, totalDrafters: 10, sampleSize: 510 }),
    ).toContain("Top 8%");
    expect(
      formatDailyPercentile({ percentile: 64, totalDrafters: 10, sampleSize: 510 }),
    ).toContain("Better than 64%");
    expect(
      formatDailyPercentile({ percentile: 20, totalDrafters: 10, sampleSize: 510 }),
    ).toContain("Bottom 20%");
  });
});
