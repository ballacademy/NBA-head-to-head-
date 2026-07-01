import { describe, expect, it } from "vitest";
import { getYesterdayDailyBestPreview } from "./dailyDraftPreview";
import { getDailyDateKey, subtractDaysFromDateKey } from "./dailyDraft";
import { getCanonicalDailyDraftSetup } from "./dailyDraftGoalResolve";
import { buildDailyGoalResult } from "./dailyGoalScoring";
import { solveBestDailyDraftLineup } from "./dailyDraftSolver";
import { getActivePlayerPool } from "./activePlayerPool";
import { players } from "./playerPool";

describe("dailyDraftPreview", () => {
  it("returns yesterday's best formatted result", () => {
    const preview = getYesterdayDailyBestPreview(getDailyDateKey(), { wins: 0 });

    expect(preview).not.toBeNull();
    expect(preview?.formattedResult.length).toBeGreaterThan(0);
    expect(preview?.title.length).toBeGreaterThan(0);
  });

  it("matches yesterday's goal to the formatted best lineup result", () => {
    const todayDateKey = getDailyDateKey();
    const yesterdayKey = subtractDaysFromDateKey(todayDateKey, 1);
    const setup = getCanonicalDailyDraftSetup(yesterdayKey);
    const pool = getActivePlayerPool({ wins: 0 }, {
      allTimeMode: false,
    });
    const bestLineup = solveBestDailyDraftLineup(
      pool,
      setup.slots,
      setup.goal,
      yesterdayKey,
    );
    const preview = getYesterdayDailyBestPreview(todayDateKey, { wins: 0 });

    expect(preview?.title).toBe(setup.goal.title);
    expect(preview?.formattedResult).toBe(
      buildDailyGoalResult(bestLineup, setup.goal).formatted,
    );
  });
});
