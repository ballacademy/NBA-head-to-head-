import { readJson, writeJson } from "./browserStorage";
import {
  fetchRemoteDailyDraftScores,
  submitRemoteDailyDraftScore,
} from "./dailyDraftApi";
import { autoDraftLineupWithVariance } from "./draft";
import { getDailySeed } from "./dailyDraft";
import { buildDailyGoalResult } from "./dailyGoalScoring";
import {
  getDailyGoalById,
  type DailyDraftGoal,
  type DailyGoalDirection,
} from "./dailyDraftGoals";
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
  percentile?: number;
  lineup?: string[];
  teamName?: string;
  submittedAt: string;
}

type DailyScoreStore = Record<string, DailyDraftScoreEntry[]>;

interface RemoteDailyCache {
  values: number[];
  totalDrafters: number;
  entry: DailyDraftScoreEntry | null;
  fetchedAt: number;
}

const remoteCache = new Map<string, RemoteDailyCache>();

const remoteCacheKey = (dateKey: string, goalId: string) =>
  `${dateKey}:${goalId}`;

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

const mergeEntryToLocal = (dateKey: string, entry: DailyDraftScoreEntry) => {
  const store = loadDailyScoreStore();
  const current = store[dateKey] ?? [];
  const withoutCurrent = current.filter(
    (candidate) => candidate.playerId !== entry.playerId,
  );

  store[dateKey] = [...withoutCurrent, entry];
  saveDailyScoreStore(store);
};

export const loadDailyScoresForDate = (dateKey: string) =>
  loadDailyScoreStore()[dateKey] ?? [];

export const summarizePlayerDailyDraftHistory = (
  playerId = getOrCreatePlayerId(),
) => {
  const store = loadDailyScoreStore();
  const entries = Object.entries(store).flatMap(([dateKey, dayEntries]) =>
    dayEntries
      .filter((entry) => entry.playerId === playerId)
      .map((entry) => ({ ...entry, dateKey })),
  );
  const percentiles = entries
    .map((entry) => entry.percentile)
    .filter((value): value is number => typeof value === "number");
  const latest = [...entries].sort((left, right) =>
    right.submittedAt.localeCompare(left.submittedAt),
  )[0];

  return {
    daysPlayed: new Set(entries.map((entry) => entry.dateKey)).size,
    bestPercentile:
      percentiles.length > 0 ? Math.max(...percentiles) : null,
    averagePercentile:
      percentiles.length > 0
        ? Math.round(
            percentiles.reduce((sum, value) => sum + value, 0) /
              percentiles.length,
          )
        : null,
    latestResult: latest?.formattedResult ?? null,
  };
};

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
    const lineupIds = autoDraftLineupWithVariance(
      players,
      slots,
      random,
      3,
      "alphabetical",
    );

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

const getRemoteCache = (dateKey: string, goalId: string) =>
  remoteCache.get(remoteCacheKey(dateKey, goalId));

export const refreshDailyDraftScoresFromApi = async (
  dateKey: string,
  goalId: string,
  playerId = getOrCreatePlayerId(),
) => {
  const remote = await fetchRemoteDailyDraftScores({
    dateKey,
    goalId,
    playerId,
  });

  if (!remote) {
    return false;
  }

  remoteCache.set(remoteCacheKey(dateKey, goalId), {
    values: remote.values,
    totalDrafters: remote.totalDrafters,
    entry: remote.entry,
    fetchedAt: Date.now(),
  });

  if (remote.entry) {
    mergeEntryToLocal(dateKey, remote.entry);
  }

  return true;
};

export const getDailyDraftPercentile = (
  dateKey: string,
  value: number,
  goal: DailyDraftGoal,
  benchmarkValues: number[],
  excludePlayerId?: string,
): DailyDraftPercentileResult => {
  const remote = getRemoteCache(dateKey, goal.id);
  const entries = loadDailyScoresForDate(dateKey).filter(
    (entry) => entry.goalId === goal.id,
  );
  const otherEntries = excludePlayerId
    ? entries.filter((entry) => entry.playerId !== excludePlayerId)
    : entries;
  const submissionValues =
    remote?.values ??
    (excludePlayerId != null
      ? otherEntries.map((entry) => entry.value)
      : entries.map((entry) => entry.value));
  const combined =
    excludePlayerId != null
      ? [...benchmarkValues, ...submissionValues, value]
      : [...benchmarkValues, ...submissionValues];
  const uniqueDrafters = new Set(otherEntries.map((entry) => entry.playerId));

  if (excludePlayerId) {
    uniqueDrafters.add(excludePlayerId);
  }

  return {
    percentile: computePercentile(value, combined, goal.direction),
    totalDrafters: remote?.totalDrafters ?? uniqueDrafters.size,
    sampleSize: combined.length,
  };
};

export const submitDailyDraftScore = async (
  dateKey: string,
  goal: DailyDraftGoal,
  value: number,
  formattedResult: string,
  benchmarkValues: number[],
  lineup: string[],
  teamName: string,
): Promise<DailyDraftPercentileResult> => {
  const playerId = getOrCreatePlayerId();
  const submittedAt = new Date().toISOString();
  const nextEntry: DailyDraftScoreEntry = {
    playerId,
    goalId: goal.id,
    value,
    formattedResult,
    lineup,
    teamName,
    submittedAt,
  };

  await submitRemoteDailyDraftScore({
    dateKey,
    goalId: goal.id,
    playerId,
    teamName,
    value,
    formattedResult,
    lineup,
  });
  await refreshDailyDraftScoresFromApi(dateKey, goal.id, playerId);

  const percentileResult = getDailyDraftPercentile(
    dateKey,
    value,
    goal,
    benchmarkValues,
    playerId,
  );

  mergeEntryToLocal(dateKey, {
    ...nextEntry,
    percentile: percentileResult.percentile,
  });

  return percentileResult;
};

export const resolvePlayerDailyDraftPercentile = (
  dateKey: string,
  entry: DailyDraftScoreEntry,
  goal: DailyDraftGoal,
  benchmarkValues: number[],
) =>
  getDailyDraftPercentile(
    dateKey,
    entry.value,
    goal,
    benchmarkValues,
    entry.playerId,
  );

export const loadReviewDailyDraftPercentile = async (
  dateKey: string,
  goal: DailyDraftGoal,
  benchmarkValues: number[],
  playerId = getOrCreatePlayerId(),
): Promise<DailyDraftPercentileResult | null> => {
  const entry = findPlayerDailyDraftEntry(dateKey, playerId);

  if (!entry) {
    return null;
  }

  await refreshDailyDraftScoresFromApi(dateKey, goal.id, playerId);

  return resolvePlayerDailyDraftPercentile(
    dateKey,
    entry,
    goal,
    benchmarkValues,
  );
};

export const findPlayerDailyDraftEntry = (
  dateKey: string,
  playerId = getOrCreatePlayerId(),
): DailyDraftScoreEntry | undefined => {
  const localEntry = loadDailyScoresForDate(dateKey).find(
    (entry) => entry.playerId === playerId,
  );

  if (localEntry) {
    return localEntry;
  }

  for (const [key, cache] of remoteCache.entries()) {
    if (!key.startsWith(`${dateKey}:`)) {
      continue;
    }

    if (cache.entry?.playerId === playerId) {
      return cache.entry;
    }
  }

  return undefined;
};

export const hasCompletedDailyDraft = (
  dateKey: string,
  _goalId?: string,
  playerId = getOrCreatePlayerId(),
) => Boolean(findPlayerDailyDraftEntry(dateKey, playerId));

export const formatPlayerDailyDraftPercentile = (
  result: DailyDraftPercentileResult,
) => formatDailyPercentile(result);

export const formatDailyPercentile = (result: DailyDraftPercentileResult) =>
  `Top ${100 - result.percentile}% Today`;

export const getPlayerDailyDraftEntry = (
  dateKey: string,
  goalId: string,
  playerId = getOrCreatePlayerId(),
) => {
  const localEntry = loadDailyScoresForDate(dateKey).find(
    (entry) => entry.playerId === playerId && entry.goalId === goalId,
  );

  if (localEntry) {
    return localEntry;
  }

  const cached = getRemoteCache(dateKey, goalId);
  return cached?.entry?.playerId === playerId ? cached.entry : undefined;
};

export const getTopDailyScoresForDate = (
  dateKey: string,
  goal: DailyDraftGoal | string,
  limit = 10,
) => {
  const goalId = typeof goal === "string" ? goal : goal.id;
  const direction =
    typeof goal === "string"
      ? getDailyGoalById(goal)?.direction ?? "higher"
      : goal.direction;

  return loadDailyScoresForDate(dateKey)
    .filter((entry) => entry.goalId === goalId)
    .sort((left, right) =>
      direction === "higher"
        ? right.value - left.value
        : left.value - right.value,
    )
    .slice(0, limit);
};

export const clearDailyDraftRemoteCacheForTests = () => {
  remoteCache.clear();
};
