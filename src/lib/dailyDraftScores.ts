import { readJson, writeJson } from "./browserStorage";
import { autoDraftLineupWithVariance } from "./draft";
import { getDailySeed } from "./dailyDraft";
import { buildDailyGoalResult } from "./dailyGoalScoring";
import type { DailyDraftGoal, DailyGoalDirection } from "./dailyDraftGoals";
import { getOrCreatePlayerId } from "./playerRecord";
import { getPlayersById } from "./scoring";
import type { DraftSlotConstraint, Player } from "./types";

const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";
const BENCHMARK_SAMPLES = 500;

export interface DailyDraftScoreEntry {
  playerId: string;
  goalId: string;
  value: number;
  formattedResult: string;
  submittedAt: string;
}

type DailyScoreStore = Record<string, DailyDraftScoreEntry[]>;

const loadDailyScoreStore = (): DailyScoreStore => {
  const saved = readJson<DailyScoreStore>(DAILY_SCORES_KEY);

  if (!saved || typeof saved !== "object") {
    return {};
  }

  return saved;
};

const saveDailyScoreStore = (store: DailyScoreStore) => {
  writeJson(DAILY_SCORES_KEY, store);
};

export const loadDailyScoresForDate = (dateKey: string) =>
  loadDailyScoreStore()[dateKey] ?? [];

export const computePercentile = (
  value: number,
  values: number[],
  direction: DailyGoalDirection = "higher",
) => {
  if (values.length === 0) {
    return 50;
  }

  const below =
    direction === "higher"
      ? values.filter((candidate) => candidate < value).length
      : values.filter((candidate) => candidate > value).length;
  const equal = values.filter((candidate) => candidate === value).length;

  return Math.round(((below + equal * 0.5) / values.length) * 100);
};

export const simulateDailyBenchmarkValues = (
  players: Player[],
  slots: DraftSlotConstraint[],
  goal: DailyDraftGoal,
  dateKey: string,
  samples = BENCHMARK_SAMPLES,
) => {
  const seed = getDailySeed(dateKey) + 913;
  let state = seed % 2147483647;

  if (state <= 0) {
    state += 2147483646;
  }

  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  const values: number[] = [];

  for (let index = 0; index < samples; index += 1) {
    const lineupIds = autoDraftLineupWithVariance(players, slots, random);

    if (lineupIds.length !== slots.length) {
      continue;
    }

    const lineup = getPlayersById(lineupIds, players);
    values.push(buildDailyGoalResult(lineup, goal).value);
  }

  return values;
};

export interface DailyDraftPercentileResult {
  percentile: number;
  totalDrafters: number;
  sampleSize: number;
}

export const getDailyDraftPercentile = (
  dateKey: string,
  value: number,
  goal: DailyDraftGoal,
  benchmarkValues: number[],
): DailyDraftPercentileResult => {
  const submissions = loadDailyScoresForDate(dateKey)
    .filter((entry) => entry.goalId === goal.id)
    .map((entry) => entry.value);
  const combined = [...benchmarkValues, ...submissions, value];
  const uniqueDrafters = new Set([
    ...loadDailyScoresForDate(dateKey)
      .filter((entry) => entry.goalId === goal.id)
      .map((entry) => entry.playerId),
    getOrCreatePlayerId(),
  ]);

  return {
    percentile: computePercentile(value, combined, goal.direction),
    totalDrafters: uniqueDrafters.size,
    sampleSize: combined.length,
  };
};

export const submitDailyDraftScore = (
  dateKey: string,
  goal: DailyDraftGoal,
  value: number,
  formattedResult: string,
  benchmarkValues: number[],
): DailyDraftPercentileResult => {
  const playerId = getOrCreatePlayerId();
  const store = loadDailyScoreStore();
  const current = store[dateKey] ?? [];
  const nextEntry: DailyDraftScoreEntry = {
    playerId,
    goalId: goal.id,
    value,
    formattedResult,
    submittedAt: new Date().toISOString(),
  };
  const withoutCurrent = current.filter((entry) => entry.playerId !== playerId);

  store[dateKey] = [...withoutCurrent, nextEntry];
  saveDailyScoreStore(store);

  return getDailyDraftPercentile(dateKey, value, goal, benchmarkValues);
};

export const formatDailyPercentile = (result: DailyDraftPercentileResult) =>
  `Top ${100 - result.percentile}% Today`;

export const getPlayerDailyDraftEntry = (
  dateKey: string,
  goalId: string,
  playerId = getOrCreatePlayerId(),
) =>
  loadDailyScoresForDate(dateKey).find(
    (entry) => entry.playerId === playerId && entry.goalId === goalId,
  );

export const getTopDailyScoresForDate = (
  dateKey: string,
  goalId: string,
  limit = 10,
) =>
  loadDailyScoresForDate(dateKey)
    .filter((entry) => entry.goalId === goalId)
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
