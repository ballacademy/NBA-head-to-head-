import { getActivePlayerPool } from "./activePlayerPool";
import type { DailyDraftMode } from "./dailyDraftMode";
import { getYesterdayBestDailyDraftSetup } from "./dailyDraftGoalResolve";
import { buildDailyGoalResult } from "./dailyGoalScoring";
import { solveBestDailyDraftLineup } from "./dailyDraftSolver";
import type { PlayerRecord } from "./playerRecord";

export interface YesterdayDailyBestPreview {
  dateKey: string;
  title: string;
  formattedResult: string;
}

export const getYesterdayDailyBestPreview = (
  todayDateKey: string,
  allTimeRecord: Pick<PlayerRecord, "wins">,
  mode: DailyDraftMode = "basic",
): YesterdayDailyBestPreview | null => {
  const setup = getYesterdayBestDailyDraftSetup(todayDateKey, mode);
  const yesterdayKey = setup.dateKey;
  const pool = getActivePlayerPool(allTimeRecord, { allTimeMode: false });
  const bestLineup = solveBestDailyDraftLineup(
    pool,
    setup.slots,
    setup.goal,
    yesterdayKey,
  );

  if (bestLineup.length < 5) {
    return null;
  }

  return {
    dateKey: yesterdayKey,
    title: setup.challenge.title,
    formattedResult: buildDailyGoalResult(bestLineup, setup.goal).formatted,
  };
};
