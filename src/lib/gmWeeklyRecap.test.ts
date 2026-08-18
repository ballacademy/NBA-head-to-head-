import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeJson } from "./browserStorage";
import {
  buildWeeklyGmRecap,
  countDailyDaysThisWeek,
  countDailyModeDaysThisWeek,
  getBestDailyPercentileThisWeek,
  getWeeklyRecapWeekKey,
} from "./gmWeeklyRecap";
import { getDailyDateKey } from "./dailyDraft";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

describe("gmWeeklyRecap", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Monday as the weekKey for mid-week dates", () => {
    expect(getWeeklyRecapWeekKey(new Date("2026-08-13T16:00:00.000Z"))).toBe(
      "2026-08-10",
    );
    expect(getWeeklyRecapWeekKey(new Date("2026-08-10T12:00:00.000Z"))).toBe(
      "2026-08-10",
    );
  });

  it("counts only daily scores from weekKey through today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T16:00:00.000Z"));

    const playerId = "player-test";
    const weekKey = getWeeklyRecapWeekKey();
    expect(weekKey).toBe("2026-08-10");

    writeJson("nba-head-to-head-daily-scores", {
      "2026-08-04": [{ playerId }],
      "2026-08-10": [{ playerId }],
      "2026-08-12": [{ playerId }],
      "2026-08-13": [{ playerId: "other-player" }],
    });

    expect(countDailyDaysThisWeek(playerId, weekKey)).toBe(2);
    expect(getDailyDateKey()).toBe("2026-08-13");

    vi.useRealTimers();
  });

  it("splits Daily days by Basic/Advanced and tracks best percentile", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T16:00:00.000Z"));

    const playerId = "player-test";
    const weekKey = getWeeklyRecapWeekKey();

    writeJson("nba-head-to-head-daily-scores", {
      "2026-08-10": [
        { playerId, goalId: "pts", mode: "basic", percentile: 70 },
        { playerId, goalId: "adv-ast", mode: "advanced", percentile: 88 },
      ],
      "2026-08-12": [
        { playerId, goalId: "pts", mode: "basic", percentile: 55 },
      ],
    });

    expect(countDailyModeDaysThisWeek(playerId, weekKey)).toEqual({
      basic: 2,
      advanced: 1,
    });
    expect(getBestDailyPercentileThisWeek(playerId, weekKey)).toBe(88);

    const recap = buildWeeklyGmRecap();
    expect(recap.weekKey).toBe("2026-08-10");
    expect(recap.weekRangeLabel).toContain("Aug");
    expect(recap).not.toHaveProperty("casualRecord");
    expect(recap).not.toHaveProperty("collectionUnlocked");
    expect(recap).not.toHaveProperty("basicStreakLabel");

    vi.useRealTimers();
  });
});
