import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeJson } from "./browserStorage";
import {
  buildWeeklyGmRecap,
  countDailyDaysThisWeek,
  countDailyModeDaysThisWeek,
  getBestDailyPercentileThisWeek,
  getLastCompletedWeeklyRecapWeekKey,
  recordWeeklyH2hResult,
  getWeeklyRecapWeekKey,
} from "./gmWeeklyRecap";
import { getDailyDateKey } from "./dailyDraft";
import { setPlayerIdentity } from "./playerIdentity";

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

  it("recaps the previous completed Mon–Sun week, not the in-progress week", () => {
    expect(
      getLastCompletedWeeklyRecapWeekKey(new Date("2026-08-13T16:00:00.000Z")),
    ).toBe("2026-08-03");
    expect(
      getLastCompletedWeeklyRecapWeekKey(new Date("2026-08-17T12:00:00.000Z")),
    ).toBe("2026-08-10");
  });

  it("counts only daily scores in the requested Mon–Sun week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T16:00:00.000Z"));

    const playerId = "player-test";
    const weekKey = getWeeklyRecapWeekKey();
    expect(weekKey).toBe("2026-08-10");

    writeJson("nba-head-to-head-daily-scores", {
      "2026-08-04": [{ playerId }],
      "2026-08-10": [{ playerId }],
      "2026-08-12": [{ playerId }],
      "2026-08-16": [{ playerId }],
      "2026-08-13": [{ playerId: "other-player" }],
    });

    expect(countDailyDaysThisWeek(playerId, weekKey)).toBe(3);
    expect(getDailyDateKey()).toBe("2026-08-13");

    vi.useRealTimers();
  });

  it("splits Daily days by Basic/Advanced and recaps last week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T16:00:00.000Z"));

    const playerId = "player-test";
    setPlayerIdentity(playerId);

    writeJson("nba-head-to-head-daily-scores", {
      "2026-08-03": [
        { playerId, goalId: "pts", mode: "basic", percentile: 70 },
        { playerId, goalId: "adv-ast", mode: "advanced", percentile: 88 },
      ],
      "2026-08-05": [
        { playerId, goalId: "pts", mode: "basic", percentile: 55 },
      ],
      "2026-08-12": [
        { playerId, goalId: "pts", mode: "basic", percentile: 99 },
      ],
    });

    const lastWeek = getLastCompletedWeeklyRecapWeekKey();
    expect(lastWeek).toBe("2026-08-03");
    expect(countDailyModeDaysThisWeek(playerId, lastWeek)).toEqual({
      basic: 2,
      advanced: 1,
    });
    expect(getBestDailyPercentileThisWeek(playerId, lastWeek)).toBe(88);

    const recap = buildWeeklyGmRecap();
    expect(recap.weekKey).toBe("2026-08-03");
    expect(recap.periodLabel).toBe("Last week");
    expect(recap.weekRangeLabel).toMatch(/Aug 3.+Aug 9/);
    expect(recap.dailyDays).toBe(2);
    expect(recap.dailyPuzzles).toBe(3);
    expect(recap.bestDailyFinishLabel).toContain("percentile");
    expect(recap).not.toHaveProperty("casualRecord");
    expect(recap).not.toHaveProperty("collectionUnlocked");
    expect(recap).not.toHaveProperty("basicStreakLabel");

    vi.useRealTimers();
  });

  it("shows an em dash when last week's scores have no stored percentile", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T16:00:00.000Z"));

    const playerId = "player-test";
    setPlayerIdentity(playerId);
    writeJson("nba-head-to-head-daily-scores", {
      "2026-08-04": [{ playerId, goalId: "pts", mode: "basic" }],
    });

    const recap = buildWeeklyGmRecap();
    expect(recap.dailyDays).toBe(1);
    expect(recap.bestDailyFinishLabel).toBe("—");

    vi.useRealTimers();
  });

  it("falls back to this week when last week has no Daily scores", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T20:00:00.000Z"));

    const playerId = "player-test";
    setPlayerIdentity(playerId);
    writeJson("nba-head-to-head-daily-scores", {
      "2026-08-17": [
        { playerId, goalId: "pts", mode: "basic", percentile: 72 },
      ],
      "2026-08-18": [
        { playerId, goalId: "adv-ast", mode: "advanced", percentile: 81 },
      ],
    });

    const recap = buildWeeklyGmRecap();
    expect(recap.weekKey).toBe("2026-08-17");
    expect(recap.periodLabel).toBe("This week");
    expect(recap.dailyDays).toBe(2);
    expect(recap.dailyPuzzles).toBe(2);
    expect(recap.bestDailyFinishLabel).toContain("percentile");

    vi.useRealTimers();
  });

  it("counts last-week scores even when playerId is missing on the row", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T20:00:00.000Z"));

    setPlayerIdentity("player-test");
    writeJson("nba-head-to-head-daily-scores", {
      "2026-08-12": [{ goalId: "pts", mode: "basic", percentile: 64 }],
    });

    const recap = buildWeeklyGmRecap();
    expect(recap.periodLabel).toBe("Last week");
    expect(recap.dailyDays).toBe(1);
    expect(recap.dailyPuzzles).toBe(1);
    expect(recap.bestDailyFinishLabel).toContain("64");

    vi.useRealTimers();
  });

  it("scopes weekly H2H recap by player id", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T20:00:00.000Z"));

    const weekKey = getWeeklyRecapWeekKey();
    expect(weekKey).toBe("2026-08-17");
    writeJson("nba-head-to-head-daily-scores", {
      "2026-08-18": [
        { playerId: "player-a", goalId: "pts", mode: "basic", percentile: 71 },
        { playerId: "player-b", goalId: "pts", mode: "basic", percentile: 63 },
      ],
    });

    recordWeeklyH2hResult("win", "player-a", "headToHead");
    recordWeeklyH2hResult("loss", "player-a", "ranked");
    recordWeeklyH2hResult("win", "player-b", "headToHead");

    setPlayerIdentity("player-a");
    const recapA = buildWeeklyGmRecap();
    expect(recapA.h2hWins).toBe(1);
    expect(recapA.h2hLosses).toBe(1);
    expect(recapA.h2hMatches).toBe(2);

    setPlayerIdentity("player-b");
    const recapB = buildWeeklyGmRecap();
    expect(recapB.h2hWins).toBe(1);
    expect(recapB.h2hLosses).toBe(0);
    expect(recapB.h2hMatches).toBe(1);

    vi.useRealTimers();
  });
});
