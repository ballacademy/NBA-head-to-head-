import { describe, expect, it } from "vitest";
import { getYesterdayDailyBestPreview } from "./dailyDraftPreview";
import { getDailyDateKey, subtractDaysFromDateKey } from "./dailyDraft";
import { getCanonicalDailyDraftSetup } from "./dailyDraftGoalResolve";
import { buildDailyGoalResult } from "./dailyGoalScoring";
import { solveBestDailyDraftLineup } from "./dailyDraftSolver";
import { getActivePlayerPool } from "./activePlayerPool";
import { players } from "./playerPool";

const PREVIEW_TEST_TIMEOUT_MS = 30_000;

describe("dailyDraftPreview", () => {
  it(
    "returns yesterday's best formatted result",
    () => {
      const preview = getYesterdayDailyBestPreview(getDailyDateKey());

      expect(preview).not.toBeNull();
      expect(preview?.formattedResult.length).toBeGreaterThan(0);
      expect(preview?.title.length).toBeGreaterThan(0);
    },
    PREVIEW_TEST_TIMEOUT_MS,
  );

  it(
    "matches yesterday's goal to the formatted best lineup result",
    () => {
      const todayDateKey = getDailyDateKey();
      const yesterdayKey = subtractDaysFromDateKey(todayDateKey, 1);
      const setup = getCanonicalDailyDraftSetup(yesterdayKey);
      const pool = getActivePlayerPool({ allTimeMode: false });
      const bestLineup = solveBestDailyDraftLineup(
        pool,
        setup.slots,
        setup.goal,
        yesterdayKey,
      );
      const preview = getYesterdayDailyBestPreview(todayDateKey);

      expect(preview?.title).toBe(setup.goal.title);
      expect(preview?.formattedResult).toBe(
        buildDailyGoalResult(bestLineup, setup.goal).formatted,
      );
    },
    PREVIEW_TEST_TIMEOUT_MS,
  );
});
