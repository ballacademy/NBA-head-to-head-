import { readJson, writeJson } from "./browserStorage";
import { autoDraftLineupWithVariance } from "./draft";
import { getDailySeed } from "./dailyDraft";
import { getOrCreatePlayerId } from "./playerRecord";
import { calculateLineupScore, getPlayersById } from "./scoring";
import type { DraftSlotConstraint, Player } from "./types";

const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";
const BENCHMARK_SAMPLES = 500;

export interface DailyDraftScoreEntry {
  playerId: string;
  ovr: number;
  projectedWins: number;
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

export const computePercentile = (value: number, values: number[]) => {
  if (values.length === 0) {
    return 50;
  }

  const below = values.filter((candidate) => candidate < value).length;
  const equal = values.filter((candidate) => candidate === value).length;

  return Math.round(((below + equal * 0.5) / values.length) * 100);
};

export const simulateDailyBenchmarkOvrs = (
  players: Player[],
  slots: DraftSlotConstraint[],
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

  const ovrs: number[] = [];

  for (let index = 0; index < samples; index += 1) {
    const lineupIds = autoDraftLineupWithVariance(players, slots, random);

    if (lineupIds.length !== slots.length) {
      continue;
    }

    const lineup = getPlayersById(lineupIds, players);
    ovrs.push(calculateLineupScore(lineup).total);
  }

  return ovrs;
};

export interface DailyDraftPercentileResult {
  percentile: number;
  totalDrafters: number;
  sampleSize: number;
}

export const getDailyDraftPercentile = (
  dateKey: string,
  ovr: number,
  benchmarkOvrs: number[],
): DailyDraftPercentileResult => {
  const submissions = loadDailyScoresForDate(dateKey).map((entry) => entry.ovr);
  const combined = [...benchmarkOvrs, ...submissions, ovr];
  const uniqueDrafters = new Set([
    ...loadDailyScoresForDate(dateKey).map((entry) => entry.playerId),
    getOrCreatePlayerId(),
  ]);

  return {
    percentile: computePercentile(ovr, combined),
    totalDrafters: uniqueDrafters.size,
    sampleSize: combined.length,
  };
};

export const submitDailyDraftScore = (
  dateKey: string,
  ovr: number,
  projectedWins: number,
  benchmarkOvrs: number[],
): DailyDraftPercentileResult => {
  const playerId = getOrCreatePlayerId();
  const store = loadDailyScoreStore();
  const current = store[dateKey] ?? [];
  const nextEntry: DailyDraftScoreEntry = {
    playerId,
    ovr,
    projectedWins,
    submittedAt: new Date().toISOString(),
  };
  const withoutCurrent = current.filter((entry) => entry.playerId !== playerId);

  store[dateKey] = [...withoutCurrent, nextEntry];
  saveDailyScoreStore(store);

  return getDailyDraftPercentile(dateKey, ovr, benchmarkOvrs);
};

export const formatDailyPercentile = (
  result: DailyDraftPercentileResult,
) => {
  if (result.percentile >= 90) {
    return `Top ${100 - result.percentile}% today`;
  }

  if (result.percentile >= 50) {
    return `Better than ${result.percentile}% of drafters today`;
  }

  return `Bottom ${result.percentile}% today`;
};
