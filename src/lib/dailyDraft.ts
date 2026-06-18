import { generateFeasibleDraftSlots, validateDraftSlotsFeasible } from "./draft";
import {
  DAILY_DRAFT_GOALS,
  DAILY_GOAL_REPEAT_WINDOW_DAYS,
  getDailyGoalById,
  type DailyDraftGoal,
} from "./dailyDraftGoals";
import type { DraftSlotConstraint, Player } from "./types";

const goalCache = new Map<string, DailyDraftGoal>();

const createSeededRandom = (seed: number) => {
  let state = seed % 2147483647;

  if (state <= 0) {
    state += 2147483646;
  }

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

export const getDailyDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDailySeed = (dateKey = getDailyDateKey()) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return year * 10000 + month * 100 + day;
};

export const subtractDaysFromDateKey = (dateKey: string, days: number) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - days);
  return getDailyDateKey(date);
};

const compareDateKeys = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const fillGoalsThrough = (dateKey: string) => {
  if (goalCache.has(dateKey)) {
    return;
  }

  const startKey = subtractDaysFromDateKey(
    dateKey,
    Math.max(DAILY_GOAL_REPEAT_WINDOW_DAYS * 2, 120),
  );
  let cursor = startKey;

  while (compareDateKeys(cursor, dateKey) <= 0) {
    if (!goalCache.has(cursor)) {
      const recentGoalIds = new Set<string>();

      for (let day = 1; day < DAILY_GOAL_REPEAT_WINDOW_DAYS; day += 1) {
        const pastKey = subtractDaysFromDateKey(cursor, day);
        const pastGoal = goalCache.get(pastKey);

        if (pastGoal) {
          recentGoalIds.add(pastGoal.id);
        }
      }

      const available = DAILY_DRAFT_GOALS.filter(
        (goal) => !recentGoalIds.has(goal.id),
      );
      const seed = getDailySeed(cursor);
      const pool = available.length > 0 ? available : DAILY_DRAFT_GOALS;
      const goal = pool[seed % pool.length]!;

      goalCache.set(cursor, goal);
    }

    if (cursor === dateKey) {
      break;
    }

    cursor = subtractDaysFromDateKey(cursor, -1);
  }
};

export const getDailyGoal = (dateKey = getDailyDateKey()): DailyDraftGoal => {
  fillGoalsThrough(dateKey);

  return goalCache.get(dateKey) ?? DAILY_DRAFT_GOALS[0]!;
};

export type DailyDraftChallenge = DailyDraftGoal;

export const getDailyChallenge = (dateKey = getDailyDateKey()) =>
  getDailyGoal(dateKey);

export const generateDailyDraftSlots = (
  players: Player[],
  dateKey = getDailyDateKey(),
) => {
  const random = createSeededRandom(getDailySeed(dateKey) + 17);

  return generateFeasibleDraftSlots(players, 5, { random });
};

export const getDailyDraftSetup = (
  players: Player[],
  dateKey = getDailyDateKey(),
) => {
  const goal = getDailyGoal(dateKey);
  const slots = generateDailyDraftSlots(players, dateKey);

  return {
    dateKey,
    goal,
    challenge: goal,
    slots,
  };
};

export const formatDailyChallengeLabel = (goal: DailyDraftGoal) => goal.title;

export const formatDailyChallengeDescription = (goal: DailyDraftGoal) =>
  goal.description;

export const isDailySlotConstraint = (
  slots: DraftSlotConstraint[],
  players: Player[],
  dateKey = getDailyDateKey(),
) => {
  const expected = generateDailyDraftSlots(players, dateKey);
  return JSON.stringify(slots) === JSON.stringify(expected);
};

export const assertDailyDraftFeasible = (
  players: Player[],
  dateKey = getDailyDateKey(),
) => {
  const setup = getDailyDraftSetup(players, dateKey);

  return validateDraftSlotsFeasible(players, setup.slots);
};

export { getDailyGoalById };
