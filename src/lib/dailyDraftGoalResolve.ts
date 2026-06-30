import {
  generateDailyDraftSlots,
  getDailyGoal as getComputedDailyGoal,
} from "./dailyDraft";
import { getDailyGoalById, type DailyDraftGoal } from "./dailyDraftGoals";
import { loadDailyScoresForDate } from "./dailyDraftScores";
import { getOrCreatePlayerId } from "./playerRecord";

const getMostCommonGoalId = (goalIds: string[]) => {
  const counts = new Map<string, number>();

  for (const goalId of goalIds) {
    counts.set(goalId, (counts.get(goalId) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
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

  const topGoalId = getMostCommonGoalId(entries.map((entry) => entry.goalId));

  if (topGoalId) {
    const storedGoal = getDailyGoalById(topGoalId);

    if (storedGoal) {
      return storedGoal;
    }
  }

  return getComputedDailyGoal(dateKey);
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
