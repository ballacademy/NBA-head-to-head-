import { describe, expect, it } from "vitest";
import {
  clearDailyDraftCachesForTests,
  getDailyGoal,
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

  it("keeps today's challenge aligned with tomorrow's yesterday best", () => {
    clearDailyDraftCachesForTests();
    const todayKey = "2026-07-03";
    const tomorrowKey = "2026-07-04";

    const todayGoal = getDailyGoal(todayKey);
    clearDailyDraftCachesForTests();
    getDailyGoal(tomorrowKey);
    const yesterdayViaTomorrow = getDailyGoal(todayKey);

    expect(yesterdayViaTomorrow.id).toBe(todayGoal.id);
    expect(todayGoal.id).toBe("anti-offense");
  });
});
