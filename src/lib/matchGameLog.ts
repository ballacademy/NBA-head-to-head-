import { readJson, writeJson } from "./browserStorage";
import type { CommunityMatchupAttachment } from "./communityShareables";
import { formatPersistedUncappedOvr } from "./scoring";
import type { HeadToHeadResult, MatchRecordMode } from "./playerRecord";

const MATCH_GAME_LOG_KEY = "ddgm:match-game-log";
export const MATCH_GAME_LOG_MAX_ENTRIES = 40;

export type MatchGameLogKind = "live" | "queued";

export type MatchGameLogMode = "classic" | "ranked" | "event" | "allTime";

export type MatchGameLogResult = "win" | "loss" | "tie";

/** Snapshot used to rebuild the dual-lineup matchup share image. */
export interface MatchGameLogMatchup {
  modeLabel: string;
  userTeam: string;
  username?: string;
  opponentTeam: string;
  userOvr: number;
  opponentOvr: number;
  userLineupNames: string[];
  opponentLineupNames: string[];
  userLineupIds?: string[];
  opponentLineupIds?: string[];
  userAccent?: string;
  opponentAccent?: string;
  userRecord?: string;
  /** Projected season W–L for the opposing five. */
  opponentRecord?: string;
  userWinRecord?: string;
  ovrOverflow?: number;
  opponentOvrOverflow?: number;
}

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
  /** Present for live matches logged after matchup share support. */
  matchup?: MatchGameLogMatchup;
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
  matchup?: MatchGameLogMatchup;
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const normalizeMatchup = (
  value: unknown,
): MatchGameLogMatchup | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const entry = value as MatchGameLogMatchup;
  if (
    typeof entry.modeLabel !== "string" ||
    typeof entry.userTeam !== "string" ||
    typeof entry.opponentTeam !== "string" ||
    typeof entry.userOvr !== "number" ||
    typeof entry.opponentOvr !== "number" ||
    !isStringArray(entry.userLineupNames) ||
    !isStringArray(entry.opponentLineupNames) ||
    entry.userLineupNames.length === 0 ||
    entry.opponentLineupNames.length === 0
  ) {
    return undefined;
  }

  return {
    modeLabel: entry.modeLabel,
    userTeam: entry.userTeam,
    username:
      typeof entry.username === "string" && entry.username.trim()
        ? entry.username.trim()
        : undefined,
    opponentTeam: entry.opponentTeam,
    userOvr: entry.userOvr,
    opponentOvr: entry.opponentOvr,
    userLineupNames: entry.userLineupNames,
    opponentLineupNames: entry.opponentLineupNames,
    userLineupIds: isStringArray(entry.userLineupIds)
      ? entry.userLineupIds
      : undefined,
    opponentLineupIds: isStringArray(entry.opponentLineupIds)
      ? entry.opponentLineupIds
      : undefined,
    userAccent:
      typeof entry.userAccent === "string" ? entry.userAccent : undefined,
    opponentAccent:
      typeof entry.opponentAccent === "string"
        ? entry.opponentAccent
        : undefined,
    userRecord:
      typeof entry.userRecord === "string" ? entry.userRecord : undefined,
    opponentRecord:
      typeof entry.opponentRecord === "string"
        ? entry.opponentRecord
        : undefined,
    userWinRecord:
      typeof entry.userWinRecord === "string"
        ? entry.userWinRecord
        : undefined,
    ovrOverflow:
      typeof entry.ovrOverflow === "number" ? entry.ovrOverflow : undefined,
    opponentOvrOverflow:
      typeof entry.opponentOvrOverflow === "number"
        ? entry.opponentOvrOverflow
        : undefined,
  };
};

const normalizeEntry = (
  entry: AppendMatchGameLogEntryInput,
): MatchGameLogEntry => {
  const matchup = normalizeMatchup(entry.matchup);
  return {
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
    ...(matchup ? { matchup } : {}),
  };
};

export const loadMatchGameLog = (): MatchGameLogEntry[] => {
  const saved = readJson<MatchGameLogEntry[]>(MATCH_GAME_LOG_KEY);
  if (!Array.isArray(saved)) {
    return [];
  }

  const next: MatchGameLogEntry[] = [];
  for (const entry of saved) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      typeof entry.recordedAt !== "string" ||
      (entry.kind !== "live" && entry.kind !== "queued") ||
      (entry.mode !== "classic" &&
        entry.mode !== "ranked" &&
        entry.mode !== "event" &&
        entry.mode !== "allTime") ||
      (entry.result !== "win" &&
        entry.result !== "loss" &&
        entry.result !== "tie") ||
      typeof entry.opponentName !== "string" ||
      typeof entry.ownerScore !== "number" ||
      typeof entry.opponentScore !== "number" ||
      typeof entry.streakCounted !== "boolean"
    ) {
      continue;
    }

    const matchup = normalizeMatchup(entry.matchup);
    next.push({
      id: entry.id,
      recordedAt: entry.recordedAt,
      kind: entry.kind,
      mode: entry.mode,
      result: entry.result,
      opponentName: entry.opponentName,
      ownerScore: entry.ownerScore,
      opponentScore: entry.opponentScore,
      bannerDelta:
        typeof entry.bannerDelta === "number" ? entry.bannerDelta : undefined,
      streakCounted: entry.streakCounted,
      ...(matchup ? { matchup } : {}),
    });
  }
  return next;
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

export const matchGameLogEntryHasMatchup = (entry: MatchGameLogEntry) =>
  Boolean(entry.matchup);

/** Convert a game-log matchup snapshot into the community rebuild shape. */
export const toCommunityMatchupAttachment = (
  entry: MatchGameLogEntry,
): CommunityMatchupAttachment | null => {
  const matchup = entry.matchup;
  if (!matchup) {
    return null;
  }

  return {
    kind: "matchup",
    modeLabel: matchup.modeLabel,
    result: entry.result,
    userTeam: matchup.userTeam,
    username: matchup.username,
    opponentTeam: matchup.opponentTeam,
    userOvr: matchup.userOvr,
    opponentOvr: matchup.opponentOvr,
    userLineupNames: matchup.userLineupNames,
    opponentLineupNames: matchup.opponentLineupNames,
    userLineupIds: matchup.userLineupIds,
    opponentLineupIds: matchup.opponentLineupIds,
    userAccent: matchup.userAccent,
    opponentAccent: matchup.opponentAccent,
    userRecord: matchup.userRecord,
    opponentRecord: matchup.opponentRecord,
    userWinRecord: matchup.userWinRecord,
    ovrOverflow: matchup.ovrOverflow,
    opponentOvrOverflow: matchup.opponentOvrOverflow,
    savedAt: entry.recordedAt,
  };
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
  matchup?: MatchGameLogMatchup;
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
    matchup: params.matchup,
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
  matchup?: MatchGameLogMatchup;
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
    matchup: params.matchup,
  });
