import { describe, expect, it } from "vitest";
import { computePercentile, formatDailyPercentile } from "./dailyDraftScores";

describe("dailyDraftScores", () => {
  it("computes percentile rank for higher-is-better goals", () => {
    const values = [40, 50, 60, 70, 80];
    expect(computePercentile(40, values, "higher")).toBe(10);
    expect(computePercentile(80, values, "higher")).toBe(90);
    expect(computePercentile(60, values, "higher")).toBe(50);
  });

  it("computes percentile rank for lower-is-better goals", () => {
    const values = [40, 50, 60, 70, 80];
    expect(computePercentile(40, values, "lower")).toBe(90);
    expect(computePercentile(80, values, "lower")).toBe(10);
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
    ).toContain("Bottom 80%");
  });
});
