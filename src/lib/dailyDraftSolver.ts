import { filterPlayersForSlot } from "./draft";
import { scoreLineupForGoal } from "./dailyGoalScoring";
import type { DailyDraftGoal } from "./dailyDraftGoals";
import type { DraftSlotConstraint, Player } from "./types";

const lineupCache = new Map<string, Player[]>();

const buildPlayerPoolFingerprint = (players: Player[]) => {
  if (players.length === 0) {
    return "0";
  }

  const sortedIds = [...players]
    .map((player) => player.id)
    .sort((left, right) => left.localeCompare(right));

  return `${players.length}:${sortedIds.join(",")}`;
};

export const buildDailyDraftSolverCacheKey = (
  dateKey: string,
  goal: DailyDraftGoal,
  slots: DraftSlotConstraint[],
  players: Player[],
) =>
  `${dateKey}:${goal.id}:${JSON.stringify(slots)}:${buildPlayerPoolFingerprint(players)}`;

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
  const resolvedCacheKey = cacheKey
    ? buildDailyDraftSolverCacheKey(cacheKey, goal, slots, players)
    : undefined;

  if (resolvedCacheKey) {
    const cached = lineupCache.get(resolvedCacheKey);

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

  if (resolvedCacheKey && bestLineup.length === slots.length) {
    lineupCache.set(
      resolvedCacheKey,
      bestLineup.map((player) => ({ ...player })),
    );
  }

  return bestLineup;
};

export const clearDailyDraftSolverCacheForTests = () => {
  lineupCache.clear();
};
