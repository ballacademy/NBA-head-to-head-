import {
  generateDailyDraftSlots,
  getDailyGoal as getComputedDailyGoal,
  subtractDaysFromDateKey,
} from "./dailyDraft";
import { getDailyGoalById, type DailyDraftGoal } from "./dailyDraftGoals";
import {
  loadDailyScoresForDate,
  refreshDailyDraftScoresFromApi,
} from "./dailyDraftScores";
import { getOrCreatePlayerId } from "./playerRecord";

export const resolveCanonicalDailyGoalForDate = (
  dateKey: string,
): DailyDraftGoal => getComputedDailyGoal(dateKey);

export const resolveDailyGoalForDate = (
  dateKey: string,
  playerId = getOrCreatePlayerId(),
): DailyDraftGoal => {
  const entries = loadDailyScoresForDate(dateKey);
  const playerEntry = entries.find((entry) => entry.playerId === playerId);

  if (playerEntry?.goalId) {
    const storedGoal = getDailyGoalById(playerEntry.goalId);

    if (storedGoal) {
      return storedGoal;
    }
  }

  return resolveCanonicalDailyGoalForDate(dateKey);
};

export const getCanonicalDailyDraftSetup = (dateKey: string) => {
  const goal = resolveCanonicalDailyGoalForDate(dateKey);
  const slots = generateDailyDraftSlots(dateKey);

  return {
    dateKey,
    goal,
    challenge: goal,
    slots,
  };
};

export const getYesterdayBestDailyDraftSetup = (viewedOnDateKey: string) =>
  getCanonicalDailyDraftSetup(subtractDaysFromDateKey(viewedOnDateKey, 1));

export const getResolvedDailyDraftSetup = (
  dateKey: string,
  playerId = getOrCreatePlayerId(),
) => {
  const goal = resolveDailyGoalForDate(dateKey, playerId);
  const slots = generateDailyDraftSlots(dateKey);

  return {
    dateKey,
    goal,
    challenge: goal,
    slots,
  };
};

export const refreshCanonicalDailyGoalData = async (
  dateKey: string,
  playerId = getOrCreatePlayerId(),
) => {
  const computedGoal = getComputedDailyGoal(dateKey);
  const refreshGoalIds = new Set<string>([computedGoal.id]);

  for (const entry of loadDailyScoresForDate(dateKey)) {
    if (entry.goalId) {
      refreshGoalIds.add(entry.goalId);
    }
  }

  await Promise.all(
    [...refreshGoalIds].map((goalId) =>
      refreshDailyDraftScoresFromApi(dateKey, goalId, playerId),
    ),
  );

  return getCanonicalDailyDraftSetup(dateKey);
};
