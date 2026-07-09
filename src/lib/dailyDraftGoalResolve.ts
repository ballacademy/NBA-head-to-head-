import {
  generateDailyDraftSlots,
  getDailyGoal as getComputedDailyGoal,
  subtractDaysFromDateKey,
} from "./dailyDraft";
import type { DailyDraftMode } from "./dailyDraftMode";
import { getDailyGoalById, type DailyDraftGoal } from "./dailyDraftGoals";
import {
  loadDailyScoresForDate,
  refreshDailyDraftScoresFromApi,
} from "./dailyDraftScores";
import { getOrCreatePlayerId } from "./playerRecord";

export const resolveCanonicalDailyGoalForDate = (
  dateKey: string,
  mode: DailyDraftMode = "basic",
): DailyDraftGoal => getComputedDailyGoal(dateKey, mode);

export const resolveDailyGoalForDate = (
  dateKey: string,
  playerId = getOrCreatePlayerId(),
  mode: DailyDraftMode = "basic",
): DailyDraftGoal => {
  const entries = loadDailyScoresForDate(dateKey, mode);
  const playerEntry = entries.find((entry) => entry.playerId === playerId);

  if (playerEntry?.goalId) {
    const storedGoal = getDailyGoalById(playerEntry.goalId);

    if (storedGoal && storedGoal.mode === mode) {
      return storedGoal;
    }
  }

  return resolveCanonicalDailyGoalForDate(dateKey, mode);
};

export const getCanonicalDailyDraftSetup = (
  dateKey: string,
  mode: DailyDraftMode = "basic",
) => {
  const goal = resolveCanonicalDailyGoalForDate(dateKey, mode);
  const slots = generateDailyDraftSlots(dateKey, mode);

  return {
    dateKey,
    mode,
    goal,
    challenge: goal,
    slots,
  };
};

export const getYesterdayBestDailyDraftSetup = (
  viewedOnDateKey: string,
  mode: DailyDraftMode = "basic",
) => getCanonicalDailyDraftSetup(subtractDaysFromDateKey(viewedOnDateKey, 1), mode);

export const getResolvedDailyDraftSetup = (
  dateKey: string,
  playerId = getOrCreatePlayerId(),
  mode: DailyDraftMode = "basic",
) => {
  const goal = resolveDailyGoalForDate(dateKey, playerId, mode);
  const slots = generateDailyDraftSlots(dateKey, mode);

  return {
    dateKey,
    mode,
    goal,
    challenge: goal,
    slots,
  };
};

export const refreshCanonicalDailyGoalData = async (
  dateKey: string,
  playerId = getOrCreatePlayerId(),
  mode: DailyDraftMode = "basic",
) => {
  const computedGoal = getComputedDailyGoal(dateKey, mode);
  const refreshGoalIds = new Set<string>([computedGoal.id]);

  for (const entry of loadDailyScoresForDate(dateKey, mode)) {
    if (entry.goalId) {
      refreshGoalIds.add(entry.goalId);
    }
  }

  await Promise.all(
    [...refreshGoalIds].map((goalId) =>
      refreshDailyDraftScoresFromApi(dateKey, goalId, playerId),
    ),
  );

  return getCanonicalDailyDraftSetup(dateKey, mode);
};
