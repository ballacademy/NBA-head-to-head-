import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  assertDailyDraftFeasible,
  getDailyChallenge,
  getDailyDateKey,
  getDailyDraftSetup,
  getDailyGoal,
  subtractDaysFromDateKey,
} from "./dailyDraft";
import { DAILY_GOAL_REPEAT_WINDOW_DAYS } from "./dailyDraftGoals";

describe("dailyDraft", () => {
  it("returns the same goal and slots for a given date", () => {
    const first = getDailyDraftSetup(players, "2026-06-15");
    const second = getDailyDraftSetup(players, "2026-06-15");

    expect(first.goal.id).toBe(second.goal.id);
    expect(first.slots).toEqual(second.slots);
  });

  it("uses a stat goal instead of a player pool filter", () => {
    const goal = getDailyChallenge("2026-06-15");

    expect(goal.title.length).toBeGreaterThan(0);
    expect(goal.description).toContain("Draft");
    expect(goal.direction).toMatch(/higher|lower/);
  });

  it("does not repeat the same goal within a 4-week window", () => {
    const startKey = "2026-06-15";

    for (let day = 0; day < DAILY_GOAL_REPEAT_WINDOW_DAYS; day += 1) {
      const dateKey = subtractDaysFromDateKey(startKey, -day);
      const goal = getDailyGoal(dateKey);

      for (let prior = 1; prior < DAILY_GOAL_REPEAT_WINDOW_DAYS; prior += 1) {
        const priorKey = subtractDaysFromDateKey(dateKey, prior);
        expect(getDailyGoal(priorKey).id).not.toBe(goal.id);
      }
    }
  });

  it("generates feasible daily slots across a year", () => {
    for (let month = 1; month <= 12; month += 1) {
      for (let day = 1; day <= 28; day += 1) {
        const dateKey = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        expect(assertDailyDraftFeasible(players, dateKey)).toBe(true);
      }
    }
  });

  it("uses the current date key by default", () => {
    expect(getDailyDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
