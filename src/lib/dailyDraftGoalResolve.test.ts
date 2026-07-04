import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDailyGoal,
  getDailyDraftSetup,
  subtractDaysFromDateKey,
} from "./dailyDraft";
import {
  getCanonicalDailyDraftSetup,
  getYesterdayBestDailyDraftSetup,
  resolveCanonicalDailyGoalForDate,
  resolveDailyGoalForDate,
} from "./dailyDraftGoalResolve";
import { writeJson } from "./browserStorage";

const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";

const stubPlayerStorage = (playerId = "test-player") => {
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
    JSON.stringify({ playerId }),
  );

  return storage;
};

describe("dailyDraftGoalResolve", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the stored player goal when one exists for the date", () => {
    stubPlayerStorage();
    const dateKey = "2026-06-29";
    const computedGoal = getDailyGoal(dateKey);
    const storedGoal = getDailyGoal("2026-06-15");

    expect(storedGoal.id).not.toBe(computedGoal.id);

    writeJson(DAILY_SCORES_KEY, {
      [dateKey]: [
        {
          playerId: "test-player",
          goalId: storedGoal.id,
          value: 12,
          formattedResult: "12.0 PPG",
          submittedAt: "2026-06-29T12:00:00.000Z",
        },
      ],
    });

    expect(resolveDailyGoalForDate(dateKey, "test-player").id).toBe(storedGoal.id);
    expect(getDailyDraftSetup(dateKey).goal.id).toBe(computedGoal.id);
  });

  it("uses the date-based daily goal as the canonical goal for a date", () => {
    stubPlayerStorage();
    const dateKey = "2026-06-29";
    const computedGoal = getDailyGoal(dateKey);
    const storedGoal = getDailyGoal("2026-06-15");

    expect(storedGoal.id).not.toBe(computedGoal.id);

    writeJson(DAILY_SCORES_KEY, {
      [dateKey]: [
        {
          playerId: "player-a",
          goalId: storedGoal.id,
          value: 12,
          formattedResult: "12.0 PPG",
          submittedAt: "2026-06-29T12:00:00.000Z",
        },
        {
          playerId: "player-b",
          goalId: storedGoal.id,
          value: 10,
          formattedResult: "10.0 PPG",
          submittedAt: "2026-06-29T12:30:00.000Z",
        },
      ],
    });

    expect(resolveCanonicalDailyGoalForDate(dateKey).id).toBe(computedGoal.id);
    expect(getCanonicalDailyDraftSetup(dateKey).goal.id).toBe(computedGoal.id);
  });

  it("uses today's date-based setup for tomorrow's yesterday best", () => {
    const todayKey = "2026-07-03";
    const tomorrowKey = subtractDaysFromDateKey(todayKey, -1);
    const todaySetup = getDailyDraftSetup(todayKey);
    const tomorrowYesterdaySetup = getYesterdayBestDailyDraftSetup(tomorrowKey);

    expect(tomorrowYesterdaySetup.dateKey).toBe(todayKey);
    expect(tomorrowYesterdaySetup.goal.id).toBe(todaySetup.goal.id);
    expect(tomorrowYesterdaySetup.goal.id).toBe("anti-offense");
    expect(tomorrowYesterdaySetup.slots).toEqual(todaySetup.slots);
  });

  it("ignores stale local goal ids when resolving yesterday best setup", () => {
    stubPlayerStorage();
    const todayKey = "2026-07-03";
    const tomorrowKey = subtractDaysFromDateKey(todayKey, -1);
    const wrongGoal = getDailyGoal("2026-06-15");

    writeJson(DAILY_SCORES_KEY, {
      [todayKey]: [
        {
          playerId: "player-a",
          goalId: wrongGoal.id,
          value: 12,
          formattedResult: "12.0 PPG",
          submittedAt: "2026-07-04T12:00:00.000Z",
        },
      ],
    });

    const tomorrowYesterdaySetup = getYesterdayBestDailyDraftSetup(tomorrowKey);
    const todaySetup = getDailyDraftSetup(todayKey);

    expect(tomorrowYesterdaySetup.goal.id).toBe(todaySetup.goal.id);
    expect(tomorrowYesterdaySetup.slots).toEqual(todaySetup.slots);
  });
});
