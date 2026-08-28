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

/** Fixed anchor so every date derives from the same forward calendar. */
export const DAILY_GOAL_CALENDAR_EPOCH = "2020-01-01";

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

/** League calendar day timezone for Daily Draft (US Eastern). */
export const DAILY_TIMEZONE = "America/New_York";

const easternDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return { year, month, day };
};

export const getDailyDateKey = (date = new Date()) => {
  const { year, month, day } = easternDateParts(date);
  return `${year}-${month}-${day}`;
};

export const getDailySeed = (dateKey = getDailyDateKey()) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return year * 10000 + month * 100 + day;
};

export const subtractDaysFromDateKey = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  // Date keys are already Eastern civil dates — shift with calendar math only.
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() - days);
  const nextYear = shifted.getUTCFullYear();
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(shifted.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
};

export const formatDailyDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  // Noon UTC keeps the civil date stable when formatting in Eastern.
  const date = new Date(Date.UTC(year, month - 1, day, 16, 0, 0));

  return date.toLocaleDateString("en-US", {
    timeZone: DAILY_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const compareDateKeys = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

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

const preloadCachedGoalsThrough = (
  mode: DailyDraftMode,
  dateKey: string,
  workingCache: Map<string, DailyDraftGoal>,
) => {
  for (const [key, goal] of goalCache) {
    const separatorIndex = key.indexOf(":");
    const cachedMode = key.slice(0, separatorIndex) as DailyDraftMode;
    const cachedDate = key.slice(separatorIndex + 1);

    if (cachedMode === mode && compareDateKeys(cachedDate, dateKey) <= 0) {
      workingCache.set(cachedDate, goal);
    }
  }
};

const buildGoalChainThrough = (
  dateKey: string,
  mode: DailyDraftMode,
  persistToGoalCache: boolean,
) => {
  const workingCache = new Map<string, DailyDraftGoal>();
  preloadCachedGoalsThrough(mode, dateKey, workingCache);

  let cursor = DAILY_GOAL_CALENDAR_EPOCH;

  while (compareDateKeys(cursor, dateKey) <= 0) {
    if (!workingCache.has(cursor)) {
      const goal = computeGoalForDate(cursor, workingCache, mode);
      workingCache.set(cursor, goal);

      if (persistToGoalCache) {
        goalCache.set(goalCacheKey(mode, cursor), goal);
      }
    }

    if (cursor === dateKey) {
      break;
    }

    cursor = subtractDaysFromDateKey(cursor, -1);
  }

  return workingCache;
};

export const buildDailyGoalChainForTests = (
  dateKey: string,
  mode: DailyDraftMode = "basic",
) => buildGoalChainThrough(dateKey, mode, false);

const fillGoalsThrough = (dateKey: string, mode: DailyDraftMode) => {
  if (goalCache.has(goalCacheKey(mode, dateKey))) {
    return;
  }

  buildGoalChainThrough(dateKey, mode, true);
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
