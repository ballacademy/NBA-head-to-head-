import { describe, expect, it, vi } from "vitest";
import {
  computePercentile,
  formatDailyPercentile,
  getDailyDraftPercentile,
  submitDailyDraftScore,
} from "./dailyDraftScores";
import { DAILY_DRAFT_GOALS } from "./dailyDraftGoals";

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
    ).toBe("Top 8% Today");
    expect(
      formatDailyPercentile({ percentile: 64, totalDrafters: 10, sampleSize: 510 }),
    ).toBe("Top 36% Today");
    expect(
      formatDailyPercentile({ percentile: 20, totalDrafters: 10, sampleSize: 510 }),
    ).toBe("Top 80% Today");
  });

  it("does not double-count the submitting score in percentile math", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      clear: () => {
        storage.clear();
      },
    });
    storage.set(
      "nba-head-to-head-player-identity",
      JSON.stringify({ playerId: "player-test-1" }),
    );

    const goal = DAILY_DRAFT_GOALS[0]!;
    const benchmarks = [10, 20, 30, 40, 50];
    const result = submitDailyDraftScore(
      "2099-01-01",
      goal,
      40,
      "40.0",
      benchmarks,
    );

    expect(result.sampleSize).toBe(benchmarks.length + 1);
    expect(result.percentile).toBe(
      getDailyDraftPercentile("2099-01-01", 40, goal, benchmarks).percentile,
    );
  });
});
