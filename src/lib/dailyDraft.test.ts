import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { getDraftablePlayers } from "./playerCollection";
import {
  assertDailyDraftFeasible,
  buildDailyGoalChainForTests,
  generateDailyDraftSlots,
  getDailyChallenge,
  getDailyDateKey,
  getDailyDraftSetup,
  getDailyGoal,
  subtractDaysFromDateKey,
} from "./dailyDraft";
import { DAILY_DRAFT_GOALS, DAILY_GOAL_REPEAT_WINDOW_DAYS } from "./dailyDraftGoals";

describe("dailyDraft", () => {
  it("returns the same goal and slots for a given date", () => {
    const first = getDailyDraftSetup("2026-06-15");
    const second = getDailyDraftSetup("2026-06-15");

    expect(first.goal.id).toBe(second.goal.id);
    expect(first.slots).toEqual(second.slots);
  });

  it("returns the same slots for a given date regardless of unlock progress", () => {
    const dateKey = "2026-06-15";
    const fullPoolSlots = generateDailyDraftSlots(dateKey);
    const sparseCollection = {
      unlockedIds: players.slice(0, 8).map((player) => player.id),
      pendingUnlock: null,
      initialized: true,
    };
    const sparsePool = getDraftablePlayers(players, sparseCollection);

    expect(sparsePool.length).toBeLessThan(players.length);
    expect(generateDailyDraftSlots(dateKey)).toEqual(fullPoolSlots);
  });

  it("rotates slots by day", () => {
    const firstDay = generateDailyDraftSlots("2026-06-15");
    const secondDay = generateDailyDraftSlots("2026-06-16");

    expect(firstDay).not.toEqual(secondDay);
  });

  it("uses a stat goal instead of a player pool filter", () => {
    const goal = getDailyChallenge("2026-06-15");

    expect(goal.title.length).toBeGreaterThan(0);
    expect(goal.description).toContain("Draft");
    expect(goal.direction).toMatch(/higher|lower/);
  });

  it("does not repeat the same goal within a 4-week window when possible", () => {
    const startKey = "2026-06-15";
    const endKey = subtractDaysFromDateKey(
      startKey,
      -(DAILY_GOAL_REPEAT_WINDOW_DAYS - 1),
    );
    const chain = buildDailyGoalChainForTests(endKey);

    for (let day = 0; day < DAILY_GOAL_REPEAT_WINDOW_DAYS; day += 1) {
      const dateKey = subtractDaysFromDateKey(startKey, -day);
      const goal = chain.get(dateKey);
      expect(goal).toBeDefined();

      for (let prior = 1; prior <= DAILY_GOAL_REPEAT_WINDOW_DAYS; prior += 1) {
        const priorKey = subtractDaysFromDateKey(dateKey, prior);
        const priorGoal = chain.get(priorKey);

        if (!priorGoal) {
          continue;
        }

        if (priorGoal.id === goal!.id) {
          const blockedIds = new Set<string>();

          for (
            let blockedDay = 1;
            blockedDay <= DAILY_GOAL_REPEAT_WINDOW_DAYS;
            blockedDay += 1
          ) {
            const blockedGoal = chain.get(
              subtractDaysFromDateKey(dateKey, blockedDay),
            );

            if (blockedGoal) {
              blockedIds.add(blockedGoal.id);
            }
          }

          expect(blockedIds.size).toBe(DAILY_DRAFT_GOALS.length);
          continue;
        }

        expect(priorGoal.id).not.toBe(goal!.id);
      }
    }
  });

  it("generates feasible daily slots across a year", () => {
    for (let month = 1; month <= 12; month += 1) {
      for (let day = 1; day <= 28; day += 1) {
        const dateKey = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        expect(assertDailyDraftFeasible(dateKey)).toBe(true);
      }
    }
  });

  it("uses the current date key by default", () => {
    expect(getDailyDateKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
