import { readJson, writeJson } from "./browserStorage";
import { formatPersistedUncappedOvr } from "./scoring";
import type { HeadToHeadResult, MatchRecordMode } from "./playerRecord";

const MATCH_GAME_LOG_KEY = "ddgm:match-game-log";
export const MATCH_GAME_LOG_MAX_ENTRIES = 40;

export type MatchGameLogKind = "live" | "queued";

export type MatchGameLogMode = "classic" | "ranked" | "event" | "allTime";

export type MatchGameLogResult = "win" | "loss" | "tie";

export interface MatchGameLogEntry {
  id: string;
  recordedAt: string;
  kind: MatchGameLogKind;
  mode: MatchGameLogMode;
  result: MatchGameLogResult;
  opponentName: string;
  ownerScore: number;
  opponentScore: number;
  bannerDelta?: number;
  /** False for queued-away results — Banners/W–L still move. */
  streakCounted: boolean;
}

export interface AppendMatchGameLogEntryInput {
  id: string;
  kind: MatchGameLogKind;
  mode: MatchGameLogMode;
  result: MatchGameLogResult;
  opponentName: string;
  ownerScore: number;
  opponentScore: number;
  bannerDelta?: number;
  streakCounted?: boolean;
  recordedAt?: string;
}

const normalizeEntry = (
  entry: AppendMatchGameLogEntryInput,
): MatchGameLogEntry => ({
  id: entry.id,
  recordedAt: entry.recordedAt ?? new Date().toISOString(),
  kind: entry.kind,
  mode: entry.mode,
  result: entry.result,
  opponentName: entry.opponentName.trim() || "Opponent",
  ownerScore: entry.ownerScore,
  opponentScore: entry.opponentScore,
  bannerDelta: entry.bannerDelta,
  streakCounted: entry.streakCounted !== false,
});

export const loadMatchGameLog = (): MatchGameLogEntry[] => {
  const saved = readJson<MatchGameLogEntry[]>(MATCH_GAME_LOG_KEY);
  if (!Array.isArray(saved)) {
    return [];
  }

  return saved.filter(
    (entry): entry is MatchGameLogEntry =>
      Boolean(entry) &&
      typeof entry.id === "string" &&
      typeof entry.recordedAt === "string" &&
      (entry.kind === "live" || entry.kind === "queued") &&
      (entry.mode === "classic" ||
        entry.mode === "ranked" ||
        entry.mode === "event" ||
        entry.mode === "allTime") &&
      (entry.result === "win" || entry.result === "loss" || entry.result === "tie") &&
      typeof entry.opponentName === "string" &&
      typeof entry.ownerScore === "number" &&
      typeof entry.opponentScore === "number" &&
      typeof entry.streakCounted === "boolean",
  );
};

export const appendMatchGameLogEntry = (
  input: AppendMatchGameLogEntryInput,
): MatchGameLogEntry | null => {
  const nextEntry = normalizeEntry(input);
  const existing = loadMatchGameLog();
  if (existing.some((entry) => entry.id === nextEntry.id)) {
    return null;
  }

  const next = [nextEntry, ...existing].slice(0, MATCH_GAME_LOG_MAX_ENTRIES);
  writeJson(MATCH_GAME_LOG_KEY, next);
  return nextEntry;
};

export const formatMatchGameLogModeLabel = (mode: MatchGameLogMode): string => {
  switch (mode) {
    case "classic":
      return "Casual";
    case "ranked":
      return "Pro";
    case "event":
      return "Event";
    case "allTime":
      return "All-Time";
    default:
      return mode;
  }
};

export const formatMatchGameLogResultLabel = (
  result: MatchGameLogResult,
): string => {
  if (result === "win") {
    return "Win";
  }
  if (result === "loss") {
    return "Loss";
  }
  return "Tie";
};

export const formatMatchGameLogScoreLine = (entry: MatchGameLogEntry): string =>
  `${formatPersistedUncappedOvr(entry.ownerScore)}–${formatPersistedUncappedOvr(entry.opponentScore)}`;

export const formatMatchGameLogWhen = (recordedAt: string): string => {
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const logLiveMatchGameEntry = (params: {
  matchId: string;
  matchRecordMode: MatchRecordMode;
  matchResult: HeadToHeadResult;
  opponentName: string;
  ownerScore: number;
  opponentScore: number;
  bannerDelta?: number;
  isEvent?: boolean;
}) => {
  const mode: MatchGameLogMode = params.isEvent
    ? "event"
    : params.matchRecordMode === "ranked"
      ? "ranked"
      : params.matchRecordMode === "allTime"
        ? "allTime"
        : "classic";

  return appendMatchGameLogEntry({
    id: params.matchId,
    kind: "live",
    mode,
    result: params.matchResult,
    opponentName: params.opponentName,
    ownerScore: params.ownerScore,
    opponentScore: params.opponentScore,
    bannerDelta: params.bannerDelta,
    streakCounted: true,
  });
};

export const logQueuedMatchGameEntry = (params: {
  matchId: string;
  mode: Extract<MatchGameLogMode, "classic" | "ranked">;
  result: MatchGameLogResult;
  opponentName: string;
  ownerScore: number;
  opponentScore: number;
  bannerDelta?: number;
}) =>
  appendMatchGameLogEntry({
    id: params.matchId,
    kind: "queued",
    mode: params.mode,
    result: params.result,
    opponentName: params.opponentName,
    ownerScore: params.ownerScore,
    opponentScore: params.opponentScore,
    bannerDelta: params.bannerDelta,
    streakCounted: false,
  });
