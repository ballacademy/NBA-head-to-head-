import { describe, expect, it } from "vitest";
import {
  clearDailyDraftCachesForTests,
  getDailyChallenge,
  getDailyGoal,
  subtractDaysFromDateKey,
} from "./dailyDraft";

describe("dailyDraft goal calendar stability", () => {
  it("computes the same goal for a date regardless of which later date is requested first", () => {
    clearDailyDraftCachesForTests();
    getDailyGoal("2026-07-04");
    const july3AfterJuly4 = getDailyGoal("2026-07-03");

    clearDailyDraftCachesForTests();
    const july3Direct = getDailyGoal("2026-07-03");

    expect(july3AfterJuly4.id).toBe(july3Direct.id);
  });

  it("keeps today's advanced challenge aligned with tomorrow's yesterday best", () => {
    clearDailyDraftCachesForTests();
    const todayKey = "2026-07-03";
    const tomorrowKey = "2026-07-04";

    const todayGoal = getDailyGoal(todayKey, "advanced");
    clearDailyDraftCachesForTests();
    getDailyGoal(tomorrowKey, "advanced");
    const yesterdayViaTomorrow = getDailyGoal(todayKey, "advanced");

    expect(yesterdayViaTomorrow.id).toBe(todayGoal.id);
  });

  it("does not repeat the same goal on consecutive days when cached in order", () => {
    clearDailyDraftCachesForTests();

    for (let day = 2; day <= 31; day += 1) {
      const current = `2026-08-${String(day).padStart(2, "0")}`;
      const previous = subtractDaysFromDateKey(current, 1);

      for (const mode of ["basic", "advanced"] as const) {
        const previousGoal = getDailyChallenge(previous, mode);
        const currentGoal = getDailyChallenge(current, mode);

        expect(
          currentGoal.id,
          `${mode} ${previous}->${current}`,
        ).not.toBe(previousGoal.id);
      }
    }
  });

  it("keeps late-August goals stable regardless of which later date is requested first", () => {
    clearDailyDraftCachesForTests();
    const direct = getDailyGoal("2026-08-26", "basic");

    clearDailyDraftCachesForTests();
    getDailyGoal("2026-08-30", "basic");
    const viaLater = getDailyGoal("2026-08-26", "basic");

    expect(viaLater.id).toBe(direct.id);
  });
});
