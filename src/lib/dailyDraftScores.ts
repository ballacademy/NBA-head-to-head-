import { readJson, writeJson } from "./browserStorage";
import {
  fetchRemoteDailyDraftScores,
  submitRemoteDailyDraftScore,
} from "./dailyDraftApi";
import { autoDraftLineupWithVariance } from "./draft";
import { getDailySeed } from "./dailyDraft";
import type { DailyDraftMode } from "./dailyDraftMode";
import { getDailyDraftModeForGoalId } from "./dailyDraftMode";
import { buildDailyGoalResult } from "./dailyGoalScoring";
import {
  getDailyGoalById,
  type DailyDraftGoal,
  type DailyGoalDirection,
} from "./dailyDraftGoals";
import { getOrCreatePlayerId } from "./playerRecord";
import { recordNbaPlayerDailyDraftUsage } from "./nbaPlayerUsage";
import { getPlayersById } from "./scoring";
import type { DraftSlotConstraint, Player } from "./types";

const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";
const BENCHMARK_SAMPLES = 500;

export interface DailyDraftScoreEntry {
  playerId: string;
  goalId: string;
  mode?: DailyDraftMode;
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

const resolveEntryMode = (entry: DailyDraftScoreEntry): DailyDraftMode =>
  entry.mode ?? getDailyDraftModeForGoalId(entry.goalId);

const normalizeEntry = (entry: DailyDraftScoreEntry): DailyDraftScoreEntry => ({
  ...entry,
  mode: resolveEntryMode(entry),
});

const isUsableDailyEntry = (
  entry: DailyDraftScoreEntry | null | undefined,
): entry is DailyDraftScoreEntry =>
  Boolean(
    entry &&
      typeof entry.playerId === "string" &&
      entry.playerId.length > 0 &&
      typeof entry.goalId === "string" &&
      entry.goalId.length > 0 &&
      typeof entry.value === "number" &&
      Number.isFinite(entry.value) &&
      typeof entry.formattedResult === "string",
  );

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
  const normalizedEntry = normalizeEntry(entry);
  const existing = current.find(
    (candidate) =>
      candidate.playerId === normalizedEntry.playerId &&
      resolveEntryMode(candidate) === normalizedEntry.mode,
  );
  const withoutCurrent = current.filter(
    (candidate) =>
      !(
        candidate.playerId === normalizedEntry.playerId &&
        resolveEntryMode(candidate) === normalizedEntry.mode
      ),
  );

  store[dateKey] = [
    ...withoutCurrent,
    {
      ...normalizedEntry,
      percentile:
        typeof normalizedEntry.percentile === "number"
          ? normalizedEntry.percentile
          : existing?.percentile,
    },
  ];
  saveDailyScoreStore(store);
};

/** Merge cloud Daily history (streaks) into local storage. */
export const mergeDailyDraftHistoryEntries = (
  entries: Array<DailyDraftScoreEntry & { dateKey: string }>,
) => {
  for (const entry of entries) {
    if (!entry.dateKey || !isUsableDailyEntry(entry)) {
      continue;
    }
    mergeEntryToLocal(entry.dateKey, entry);
  }
};

export const loadDailyScoresForDate = (
  dateKey: string,
  mode?: DailyDraftMode,
) => {
  const entries = (loadDailyScoreStore()[dateKey] ?? []).map(normalizeEntry);

  if (!mode) {
    return entries;
  }

  return entries.filter((entry) => resolveEntryMode(entry) === mode);
};

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
  mode: DailyDraftMode = getDailyDraftModeForGoalId(goalId),
) => {
  const remote = await fetchRemoteDailyDraftScores({
    dateKey,
    goalId,
    mode,
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

export type DailyDraftSubmitResult = DailyDraftPercentileResult & {
  remoteSynced: boolean;
  entry: DailyDraftScoreEntry;
  /** True when the server already had a first attempt (409) we adopted. */
  adoptedExisting: boolean;
};

export const submitDailyDraftScore = async (
  dateKey: string,
  goal: DailyDraftGoal,
  value: number,
  formattedResult: string,
  benchmarkValues: number[],
  lineup: string[],
  teamName: string,
): Promise<DailyDraftSubmitResult> => {
  const playerId = getOrCreatePlayerId();
  const submittedAt = new Date().toISOString();
  const nextEntry: DailyDraftScoreEntry = {
    playerId,
    goalId: goal.id,
    mode: goal.mode,
    value,
    formattedResult,
    lineup,
    teamName,
    submittedAt,
  };

  const remoteEntry = await submitRemoteDailyDraftScore({
    dateKey,
    goalId: goal.id,
    mode: goal.mode,
    playerId,
    teamName,
    value,
    formattedResult,
    lineup,
  });
  const refreshed = await refreshDailyDraftScoresFromApi(
    dateKey,
    goal.id,
    playerId,
    goal.mode,
  );

  const usableRemote = isUsableDailyEntry(remoteEntry) ? remoteEntry : null;
  const storedAfterRefresh = findPlayerDailyDraftEntry(
    dateKey,
    playerId,
    goal.mode,
  );
  // Prefer the canonical server entry (including 409 first-attempt), then a
  // refresh-hydrated local row, and only then this attempt (offline / first save).
  const canonicalEntry = normalizeEntry(
    usableRemote ?? storedAfterRefresh ?? nextEntry,
  );
  const sameAttempt =
    canonicalEntry.value === value &&
    JSON.stringify(canonicalEntry.lineup ?? []) === JSON.stringify(lineup);
  const adoptedExisting =
    !sameAttempt && Boolean(usableRemote ?? storedAfterRefresh);

  const percentileResult = getDailyDraftPercentile(
    dateKey,
    canonicalEntry.value,
    goal,
    benchmarkValues,
    playerId,
  );

  const entryWithPercentile: DailyDraftScoreEntry = {
    ...canonicalEntry,
    percentile: percentileResult.percentile,
  };
  mergeEntryToLocal(dateKey, entryWithPercentile);

  const usageLineup = entryWithPercentile.lineup ?? lineup;
  if (Array.isArray(usageLineup) && usageLineup.length > 0) {
    recordNbaPlayerDailyDraftUsage({
      recordKey: `daily:${dateKey}:${resolveEntryMode(entryWithPercentile)}:${entryWithPercentile.playerId}`,
      playerIds: usageLineup,
    });
  }

  return {
    ...percentileResult,
    remoteSynced: Boolean(usableRemote) || refreshed,
    entry: entryWithPercentile,
    adoptedExisting,
  };
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
  const entry = findPlayerDailyDraftEntry(dateKey, playerId, goal.mode);

  if (!entry) {
    return null;
  }

  await refreshDailyDraftScoresFromApi(dateKey, goal.id, playerId, goal.mode);

  const refreshedEntry =
    findPlayerDailyDraftEntry(dateKey, playerId, goal.mode) ?? entry;

  return resolvePlayerDailyDraftPercentile(
    dateKey,
    refreshedEntry,
    goal,
    benchmarkValues,
  );
};

export const findPlayerDailyDraftEntry = (
  dateKey: string,
  playerId = getOrCreatePlayerId(),
  mode: DailyDraftMode = "basic",
): DailyDraftScoreEntry | undefined => {
  const localEntry = loadDailyScoresForDate(dateKey, mode).find(
    (entry) => entry.playerId === playerId,
  );

  if (localEntry) {
    return localEntry;
  }

  for (const [key, cache] of remoteCache.entries()) {
    if (!key.startsWith(`${dateKey}:`)) {
      continue;
    }

    if (
      cache.entry?.playerId === playerId &&
      resolveEntryMode(cache.entry) === mode
    ) {
      return cache.entry;
    }
  }

  return undefined;
};

export const hasCompletedDailyDraft = (
  dateKey: string,
  mode: DailyDraftMode = "basic",
  playerId = getOrCreatePlayerId(),
) => Boolean(findPlayerDailyDraftEntry(dateKey, playerId, mode));

export const formatPlayerDailyDraftPercentile = (
  result: DailyDraftPercentileResult,
) => formatDailyPercentile(result);

export const formatDailyPercentile = (result: DailyDraftPercentileResult) =>
  `Top ${100 - result.percentile}% Today`;

export const getPlayerDailyDraftEntry = (
  dateKey: string,
  goalId: string,
  playerId = getOrCreatePlayerId(),
  mode: DailyDraftMode = "basic",
) => {
  const localEntry = loadDailyScoresForDate(dateKey, mode).find(
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

export const clearDailyDraftRemoteCache = () => {
  remoteCache.clear();
};

export type FlushDailyDraftScoresResult =
  | { ok: true; submitted: number }
  | { ok: false; submitted: number; failed: number };

/**
 * Best-effort push of this player's local Daily scores before logout wipe.
 * Re-submit is safe: the API returns the stored first attempt on 409.
 */
export const flushLocalDailyDraftScoresToRemote = async (
  playerId: string,
): Promise<FlushDailyDraftScoresResult> => {
  const trimmed = playerId.trim();
  if (!trimmed) {
    return { ok: true, submitted: 0 };
  }

  const store = loadDailyScoreStore();
  const pending: Array<{ dateKey: string; entry: DailyDraftScoreEntry }> = [];

  for (const [dateKey, entries] of Object.entries(store)) {
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const raw of entries) {
      const entry = normalizeEntry(raw);
      if (entry.playerId === trimmed && isUsableDailyEntry(entry)) {
        pending.push({ dateKey, entry });
      }
    }
  }

  if (pending.length === 0) {
    return { ok: true, submitted: 0 };
  }

  let submitted = 0;
  let failed = 0;

  for (const { dateKey, entry } of pending) {
    const remote = await submitRemoteDailyDraftScore({
      dateKey,
      goalId: entry.goalId,
      mode: resolveEntryMode(entry),
      playerId: entry.playerId,
      teamName: entry.teamName?.trim() || "GM",
      value: entry.value,
      formattedResult: entry.formattedResult,
      lineup: Array.isArray(entry.lineup) ? entry.lineup : [],
    });

    if (remote) {
      submitted += 1;
    } else {
      failed += 1;
    }
  }

  if (failed > 0) {
    return { ok: false, submitted, failed };
  }

  return { ok: true, submitted };
};
