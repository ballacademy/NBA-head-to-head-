import { getDailyGoalById } from "../../src/lib/dailyDraftGoals";
import {
  formatGoalResult,
  scoreLineupForGoal,
} from "../../src/lib/dailyGoalScoring";
import { playersById } from "../../src/lib/playerPool";
import type { Player } from "../../src/lib/types";

/** Server-side daily draft value; null if goal or any lineup id is invalid. */
export const computeDailySubmissionValue = (
  goalId: string,
  lineupIds: string[],
): { value: number; formattedResult: string } | null => {
  const goal = getDailyGoalById(goalId);
  if (!goal) {
    return null;
  }

  if (lineupIds.length !== 5) {
    return null;
  }

  const lineup: Player[] = [];
  for (const id of lineupIds) {
    const player = playersById.get(id);
    if (!player) {
      return null;
    }
    lineup.push(player);
  }

  const value = scoreLineupForGoal(lineup, goal);
  return {
    value,
    formattedResult: formatGoalResult(value, goal),
  };
};
