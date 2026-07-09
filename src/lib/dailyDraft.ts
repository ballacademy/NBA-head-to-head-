import {
  generateBalancedSeededSlotConstraints,
  generateSeededSlotConstraints,
  validateDraftSlotsFeasible,
} from "./draft";
import type { DailyDraftMode } from "./dailyDraftMode";
import {
  DAILY_GOAL_REPEAT_WINDOW_DAYS,
  getDailyDraftGoalsForMode,
  getDailyGoalById,
  type DailyDraftGoal,
} from "./dailyDraftGoals";
import { players as canonicalPlayers } from "./playerPool";
import type { DraftSlotConstraint } from "./types";

const goalCache = new Map<string, DailyDraftGoal>();
const slotCache = new Map<string, DraftSlotConstraint[]>();

const DAILY_SLOT_ATTEMPTS = 64;
const DAILY_SLOT_SEED_OFFSET = 17;
const ADVANCED_DAILY_SLOT_SEED_OFFSET = 503;
const ADVANCED_DAILY_GOAL_SEED_OFFSET = 1003;
const DAILY_SLOT_ATTEMPT_STEP = 7919;

const goalCacheKey = (mode: DailyDraftMode, dateKey: string) =>
  `${mode}:${dateKey}`;

const slotCacheKey = (mode: DailyDraftMode, dateKey: string) =>
  `${mode}:${dateKey}`;

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

export const formatDailyDateLabel = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const compareDateKeys = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const getGoalCalendarBootstrapStartKey = (dateKey: string) =>
  subtractDaysFromDateKey(
    dateKey,
    Math.max(DAILY_GOAL_REPEAT_WINDOW_DAYS * 2, 120),
  );

const computeGoalForDate = (
  dateKey: string,
  workingCache: Map<string, DailyDraftGoal>,
  mode: DailyDraftMode,
) => {
  const goals = getDailyDraftGoalsForMode(mode);
  const recentGoalIds = new Set<string>();

  for (let day = 1; day <= DAILY_GOAL_REPEAT_WINDOW_DAYS; day += 1) {
    const pastKey = subtractDaysFromDateKey(dateKey, day);
    const pastGoal = workingCache.get(pastKey);

    if (pastGoal) {
      recentGoalIds.add(pastGoal.id);
    }
  }

  const available = goals.filter((goal) => !recentGoalIds.has(goal.id));

  if (available.length > 0) {
    const seed =
      getDailySeed(dateKey) +
      (mode === "advanced" ? ADVANCED_DAILY_GOAL_SEED_OFFSET : 0);
    return available[seed % available.length]!;
  }

  let bestGoal = goals[0]!;
  let bestDistance = -1;

  for (const goal of goals) {
    let distance = DAILY_GOAL_REPEAT_WINDOW_DAYS * 2;

    for (let day = 1; day <= DAILY_GOAL_REPEAT_WINDOW_DAYS * 2; day += 1) {
      const pastKey = subtractDaysFromDateKey(dateKey, day);
      const pastGoal = workingCache.get(pastKey);

      if (pastGoal?.id === goal.id) {
        distance = day;
        break;
      }
    }

    if (distance > bestDistance) {
      bestDistance = distance;
      bestGoal = goal;
    }
  }

  return bestGoal;
};

const buildIsolatedDailyGoal = (dateKey: string, mode: DailyDraftMode) => {
  const workingCache = new Map<string, DailyDraftGoal>();
  const startKey = getGoalCalendarBootstrapStartKey(dateKey);
  let cursor = startKey;

  while (compareDateKeys(cursor, dateKey) <= 0) {
    const goal = computeGoalForDate(cursor, workingCache, mode);
    workingCache.set(cursor, goal);

    if (cursor === dateKey) {
      break;
    }

    cursor = subtractDaysFromDateKey(cursor, -1);
  }

  return workingCache.get(dateKey) ?? getDailyDraftGoalsForMode(mode)[0]!;
};

export const buildDailyGoalChainForTests = (
  dateKey: string,
  mode: DailyDraftMode = "basic",
) => {
  const workingCache = new Map<string, DailyDraftGoal>();
  const startKey = getGoalCalendarBootstrapStartKey(dateKey);
  let cursor = startKey;

  while (compareDateKeys(cursor, dateKey) <= 0) {
    workingCache.set(cursor, computeGoalForDate(cursor, workingCache, mode));

    if (cursor === dateKey) {
      break;
    }

    cursor = subtractDaysFromDateKey(cursor, -1);
  }

  return workingCache;
};

const fillGoalsThrough = (dateKey: string, mode: DailyDraftMode) => {
  const cacheKey = goalCacheKey(mode, dateKey);

  if (goalCache.has(cacheKey)) {
    return;
  }

  goalCache.set(cacheKey, buildIsolatedDailyGoal(dateKey, mode));
};

export const clearDailyDraftCachesForTests = () => {
  goalCache.clear();
  slotCache.clear();
};

export const getDailyGoal = (
  dateKey = getDailyDateKey(),
  mode: DailyDraftMode = "basic",
): DailyDraftGoal => {
  fillGoalsThrough(dateKey, mode);

  return goalCache.get(goalCacheKey(mode, dateKey)) ?? getDailyDraftGoalsForMode(mode)[0]!;
};

export type DailyDraftChallenge = DailyDraftGoal;

export const getDailyChallenge = (
  dateKey = getDailyDateKey(),
  mode: DailyDraftMode = "basic",
) => getDailyGoal(dateKey, mode);

export const generateDailyDraftSlots = (
  dateKey = getDailyDateKey(),
  mode: DailyDraftMode = "basic",
): DraftSlotConstraint[] => {
  const cacheKey = slotCacheKey(mode, dateKey);
  const cached = slotCache.get(cacheKey);

  if (cached) {
    return cached.map((slot) => ({ ...slot }));
  }

  const baseSeed =
    getDailySeed(dateKey) +
    DAILY_SLOT_SEED_OFFSET +
    (mode === "advanced" ? ADVANCED_DAILY_SLOT_SEED_OFFSET : 0);

  for (let attempt = 0; attempt < DAILY_SLOT_ATTEMPTS; attempt += 1) {
    const random = createSeededRandom(baseSeed + attempt * DAILY_SLOT_ATTEMPT_STEP);
    const slots = generateSeededSlotConstraints(random, 5);

    if (slots && validateDraftSlotsFeasible(canonicalPlayers, slots)) {
      slotCache.set(cacheKey, slots.map((slot) => ({ ...slot })));
      return slots;
    }
  }

  const fallbackRandom = createSeededRandom(baseSeed);
  const fallbackSlots =
    generateBalancedSeededSlotConstraints(fallbackRandom) ??
    generateSeededSlotConstraints(fallbackRandom, 5) ??
    [];

  if (validateDraftSlotsFeasible(canonicalPlayers, fallbackSlots)) {
    slotCache.set(
      cacheKey,
      fallbackSlots.map((slot) => ({ ...slot })),
    );
  }

  return fallbackSlots.map((slot) => ({ ...slot }));
};

export const getDailyDraftSetup = (
  dateKey = getDailyDateKey(),
  mode: DailyDraftMode = "basic",
) => {
  const goal = getDailyGoal(dateKey, mode);
  const slots = generateDailyDraftSlots(dateKey, mode);

  return {
    dateKey,
    mode,
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
  dateKey = getDailyDateKey(),
  mode: DailyDraftMode = "basic",
) => {
  const expected = generateDailyDraftSlots(dateKey, mode);
  return JSON.stringify(slots) === JSON.stringify(expected);
};

export const assertDailyDraftFeasible = (
  dateKey = getDailyDateKey(),
  mode: DailyDraftMode = "basic",
) => {
  const slots = generateDailyDraftSlots(dateKey, mode);

  return validateDraftSlotsFeasible(canonicalPlayers, slots);
};

export { getDailyGoalById };
