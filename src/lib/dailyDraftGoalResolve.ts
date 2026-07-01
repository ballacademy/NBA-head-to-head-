import {
  generateDailyDraftSlots,
  getDailyGoal as getComputedDailyGoal,
} from "./dailyDraft";
import { getDailyGoalById, type DailyDraftGoal } from "./dailyDraftGoals";
import {
  loadDailyScoresForDate,
  refreshDailyDraftScoresFromApi,
} from "./dailyDraftScores";
import { getOrCreatePlayerId } from "./playerRecord";

const getMostCommonGoalId = (goalIds: string[]) => {
  const counts = new Map<string, number>();

  for (const goalId of goalIds) {
    if (!goalId) {
      continue;
    }

    counts.set(goalId, (counts.get(goalId) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
};

export const resolveCanonicalDailyGoalForDate = (
  dateKey: string,
): DailyDraftGoal => {
  const entries = loadDailyScoresForDate(dateKey);
  const topGoalId = getMostCommonGoalId(entries.map((entry) => entry.goalId));

  if (topGoalId) {
    const storedGoal = getDailyGoalById(topGoalId);

    if (storedGoal) {
      return storedGoal;
    }
  }

  return getComputedDailyGoal(dateKey);
};

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
  const goalIds = new Set<string>([getComputedDailyGoal(dateKey).id]);

  for (const entry of loadDailyScoresForDate(dateKey)) {
    if (entry.goalId) {
      goalIds.add(entry.goalId);
    }
  }

  await Promise.all(
    [...goalIds].map((goalId) =>
      refreshDailyDraftScoresFromApi(dateKey, goalId, playerId),
    ),
  );

  return getCanonicalDailyDraftSetup(dateKey);
};
