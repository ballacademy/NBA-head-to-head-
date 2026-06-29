import { filterPlayersForSlot } from "./draft";
import { scoreLineupForGoal } from "./dailyGoalScoring";
import type { DailyDraftGoal } from "./dailyDraftGoals";
import type { DraftSlotConstraint, Player } from "./types";

const lineupCache = new Map<string, Player[]>();

const compareLineups = (left: Player[], right: Player[]) => {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const comparison = left[index]!.name.localeCompare(right[index]!.name);

    if (comparison !== 0) {
      return comparison;
    }
  }

  return left.length - right.length;
};

const isBetterLineup = (
  candidate: Player[],
  candidateScore: number,
  bestLineup: Player[],
  bestScore: number,
  goal: DailyDraftGoal,
) => {
  if (bestLineup.length === 0) {
    return true;
  }

  if (candidateScore !== bestScore) {
    return goal.direction === "higher"
      ? candidateScore > bestScore
      : candidateScore < bestScore;
  }

  return compareLineups(candidate, bestLineup) < 0;
};

export const solveBestDailyDraftLineup = (
  players: Player[],
  slots: DraftSlotConstraint[],
  goal: DailyDraftGoal,
  cacheKey?: string,
): Player[] => {
  if (cacheKey) {
    const cached = lineupCache.get(cacheKey);

    if (cached) {
      return cached.map((player) => ({ ...player }));
    }
  }

  let bestLineup: Player[] = [];
  let bestScore = goal.direction === "higher" ? -Infinity : Infinity;

  const search = (
    slotIndex: number,
    picked: Player[],
    pickedIds: Set<string>,
  ) => {
    if (slotIndex >= slots.length) {
      const score = scoreLineupForGoal(picked, goal);

      if (isBetterLineup(picked, score, bestLineup, bestScore, goal)) {
        bestScore = score;
        bestLineup = picked.map((player) => ({ ...player }));
      }

      return;
    }

    const candidates = filterPlayersForSlot(
      players,
      slots[slotIndex]!,
      pickedIds,
    );

    for (const candidate of candidates) {
      picked.push(candidate);
      pickedIds.add(candidate.id);
      search(slotIndex + 1, picked, pickedIds);
      picked.pop();
      pickedIds.delete(candidate.id);
    }
  };

  search(0, [], new Set());

  if (cacheKey && bestLineup.length === slots.length) {
    lineupCache.set(
      cacheKey,
      bestLineup.map((player) => ({ ...player })),
    );
  }

  return bestLineup;
};

export const clearDailyDraftSolverCacheForTests = () => {
  lineupCache.clear();
};
