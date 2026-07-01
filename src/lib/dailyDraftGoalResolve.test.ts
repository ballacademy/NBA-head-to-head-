import { afterEach, describe, expect, it, vi } from "vitest";
import { getDailyGoal, getDailyDraftSetup } from "./dailyDraft";
import {
  getCanonicalDailyDraftSetup,
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

  it("uses the most common stored goal as the canonical goal for a date", () => {
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

    expect(resolveCanonicalDailyGoalForDate(dateKey).id).toBe(storedGoal.id);
    expect(getCanonicalDailyDraftSetup(dateKey).goal.id).toBe(storedGoal.id);
  });
});
