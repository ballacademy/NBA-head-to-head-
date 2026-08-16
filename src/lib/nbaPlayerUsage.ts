import { readJson, writeJson } from "./browserStorage";
import { getOrCreatePlayerId, type HeadToHeadResult } from "./playerRecord";

const USAGE_KEY = "nba-head-to-head-nba-player-usage";
const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";
const MAX_RECORDED_KEYS = 200;

export type NbaPlayerUsageMode =
  | "daily"
  | "headToHead"
  | "ranked"
  | "allTime"
  | "event";

export interface NbaPlayerModeUsage {
  drafts: number;
  wins: number;
  losses: number;
  ties: number;
}

export interface NbaPlayerUsageStore {
  version: 1;
  byPlayerId: Record<string, Partial<Record<NbaPlayerUsageMode, NbaPlayerModeUsage>>>;
  /** Match / daily attempt keys already applied (dedupe). */
  recordedKeys: string[];
  dailyBackfillDone?: boolean;
  /** Last lineup attributed per daily record key (canonical replace). */
  dailyLineups?: Record<string, string[]>;
}

export interface NbaPlayerUsageRow {
  playerId: string;
  drafts: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number | null;
  byMode: Partial<Record<NbaPlayerUsageMode, NbaPlayerModeUsage>>;
}

const emptyMode = (): NbaPlayerModeUsage => ({
  drafts: 0,
  wins: 0,
  losses: 0,
  ties: 0,
});

const emptyStore = (): NbaPlayerUsageStore => ({
  version: 1,
  byPlayerId: {},
  recordedKeys: [],
  dailyBackfillDone: false,
  dailyLineups: {},
});

const sanitizeMode = (value: unknown): NbaPlayerModeUsage => {
  if (!value || typeof value !== "object") {
    return emptyMode();
  }

  const row = value as Partial<NbaPlayerModeUsage>;
  return {
    drafts: Math.max(0, Math.floor(Number(row.drafts) || 0)),
    wins: Math.max(0, Math.floor(Number(row.wins) || 0)),
    losses: Math.max(0, Math.floor(Number(row.losses) || 0)),
    ties: Math.max(0, Math.floor(Number(row.ties) || 0)),
  };
};

const uniquePlayerIds = (playerIds: string[]) =>
  [...new Set(playerIds.filter((id) => typeof id === "string" && id.length > 0))];

const sameIdSet = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
};

export const loadNbaPlayerUsageStore = (): NbaPlayerUsageStore => {
  const saved = readJson<Partial<NbaPlayerUsageStore>>(USAGE_KEY);
  if (!saved || saved.version !== 1 || typeof saved.byPlayerId !== "object") {
    return emptyStore();
  }

  const byPlayerId: NbaPlayerUsageStore["byPlayerId"] = {};
  for (const [playerId, modes] of Object.entries(saved.byPlayerId ?? {})) {
    if (!playerId || !modes || typeof modes !== "object") {
      continue;
    }
    const nextModes: Partial<Record<NbaPlayerUsageMode, NbaPlayerModeUsage>> = {};
    for (const mode of [
      "daily",
      "headToHead",
      "ranked",
      "allTime",
      "event",
    ] as const) {
      if (modes[mode]) {
        nextModes[mode] = sanitizeMode(modes[mode]);
      }
    }
    if (Object.keys(nextModes).length > 0) {
      byPlayerId[playerId] = nextModes;
    }
  }

  const recordedKeys = Array.isArray(saved.recordedKeys)
    ? saved.recordedKeys.filter(
        (key): key is string => typeof key === "string" && key.length > 0,
      )
    : [];

  const dailyLineups: Record<string, string[]> = {};
  if (saved.dailyLineups && typeof saved.dailyLineups === "object") {
    for (const [key, lineup] of Object.entries(saved.dailyLineups)) {
      if (typeof key === "string" && Array.isArray(lineup)) {
        dailyLineups[key] = uniquePlayerIds(lineup);
      }
    }
  }

  return {
    version: 1,
    byPlayerId,
    recordedKeys,
    dailyBackfillDone: Boolean(saved.dailyBackfillDone),
    dailyLineups,
  };
};

export const saveNbaPlayerUsageStore = (store: NbaPlayerUsageStore) => {
  writeJson(USAGE_KEY, store);
};

const rememberKey = (store: NbaPlayerUsageStore, key: string) => {
  store.recordedKeys = [
    key,
    ...store.recordedKeys.filter((existing) => existing !== key),
  ].slice(0, MAX_RECORDED_KEYS);
};

const bumpMode = (
  store: NbaPlayerUsageStore,
  playerId: string,
  mode: NbaPlayerUsageMode,
  patch: Partial<NbaPlayerModeUsage>,
) => {
  const modes = store.byPlayerId[playerId] ?? {};
  const current = modes[mode] ?? emptyMode();
  modes[mode] = {
    drafts: Math.max(0, current.drafts + (patch.drafts ?? 0)),
    wins: Math.max(0, current.wins + (patch.wins ?? 0)),
    losses: Math.max(0, current.losses + (patch.losses ?? 0)),
    ties: Math.max(0, current.ties + (patch.ties ?? 0)),
  };
  const next = modes[mode]!;
  if (next.drafts === 0 && next.wins === 0 && next.losses === 0 && next.ties === 0) {
    delete modes[mode];
  }
  if (Object.keys(modes).length === 0) {
    delete store.byPlayerId[playerId];
  } else {
    store.byPlayerId[playerId] = modes;
  }
};

const resultPatch = (
  result: HeadToHeadResult,
): Pick<NbaPlayerModeUsage, "wins" | "losses" | "ties"> => {
  if (result === "win") return { wins: 1, losses: 0, ties: 0 };
  if (result === "loss") return { wins: 0, losses: 1, ties: 0 };
  return { wins: 0, losses: 0, ties: 1 };
};

/**
 * Competitive / event match: each lineup player gets +1 draft and W/L/T.
 * Deduped by `recordKey` (usually matchId).
 */
export const recordNbaPlayerMatchUsage = (params: {
  recordKey: string;
  playerIds: string[];
  mode: Exclude<NbaPlayerUsageMode, "daily">;
  result: HeadToHeadResult;
}): boolean => {
  const playerIds = uniquePlayerIds(params.playerIds);
  if (!params.recordKey || playerIds.length === 0) {
    return false;
  }

  const store = loadNbaPlayerUsageStore();
  if (store.recordedKeys.includes(params.recordKey)) {
    return false;
  }

  const patch = { drafts: 1, ...resultPatch(params.result) };
  for (const playerId of playerIds) {
    bumpMode(store, playerId, params.mode, patch);
  }
  rememberKey(store, params.recordKey);
  saveNbaPlayerUsageStore(store);
  return true;
};

/**
 * Daily Draft: draft counts only (no W/L).
 * Deduped by date+mode+gm key. If the canonical lineup later changes
 * (409 adopt), reverse the prior attribution and apply the new one.
 */
export const recordNbaPlayerDailyDraftUsage = (params: {
  recordKey: string;
  playerIds: string[];
}): boolean => {
  const playerIds = uniquePlayerIds(params.playerIds);
  if (!params.recordKey || playerIds.length === 0) {
    return false;
  }

  const store = loadNbaPlayerUsageStore();
  const previous = store.dailyLineups?.[params.recordKey];
  if (previous && sameIdSet(previous, playerIds)) {
    return false;
  }

  if (previous) {
    for (const playerId of previous) {
      bumpMode(store, playerId, "daily", { drafts: -1 });
    }
  }

  for (const playerId of playerIds) {
    bumpMode(store, playerId, "daily", { drafts: 1 });
  }

  store.dailyLineups = {
    ...(store.dailyLineups ?? {}),
    [params.recordKey]: playerIds,
  };
  rememberKey(store, params.recordKey);
  saveNbaPlayerUsageStore(store);
  return true;
};

/**
 * One-time seed from local Daily Draft lineup history for the **current** GM
 * identity only (ignores leftover rows from other identities on this device).
 */
export const backfillNbaPlayerUsageFromDailyScores = (
  gmPlayerId = getOrCreatePlayerId(),
): number => {
  const store = loadNbaPlayerUsageStore();
  if (store.dailyBackfillDone) {
    return 0;
  }

  const allScores = readJson<
    Record<
      string,
      Array<{
        playerId?: string;
        mode?: string;
        lineup?: string[];
      }>
    >
  >(DAILY_SCORES_KEY);
  let applied = 0;

  for (const [dateKey, entries] of Object.entries(allScores ?? {})) {
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      const lineup = entry?.lineup;
      if (!Array.isArray(lineup) || lineup.length === 0) {
        continue;
      }

      const entryGmId =
        typeof entry.playerId === "string" && entry.playerId.length > 0
          ? entry.playerId
          : gmPlayerId;
      if (entryGmId !== gmPlayerId) {
        continue;
      }

      const mode = entry.mode === "advanced" ? "advanced" : "basic";
      const recordKey = `daily:${dateKey}:${mode}:${gmPlayerId}`;
      const playerIds = uniquePlayerIds(lineup);
      const previous = store.dailyLineups?.[recordKey];
      if (previous && sameIdSet(previous, playerIds)) {
        continue;
      }
      if (store.recordedKeys.includes(recordKey) && !previous) {
        // Legacy key without lineup snapshot — don't double-count.
        continue;
      }
      if (previous) {
        for (const playerId of previous) {
          bumpMode(store, playerId, "daily", { drafts: -1 });
        }
      }
      for (const playerId of playerIds) {
        bumpMode(store, playerId, "daily", { drafts: 1 });
      }
      store.dailyLineups = {
        ...(store.dailyLineups ?? {}),
        [recordKey]: playerIds,
      };
      rememberKey(store, recordKey);
      applied += 1;
    }
  }

  store.dailyBackfillDone = true;
  saveNbaPlayerUsageStore(store);
  return applied;
};

const aggregatePlayer = (
  playerId: string,
  byMode: Partial<Record<NbaPlayerUsageMode, NbaPlayerModeUsage>>,
): NbaPlayerUsageRow => {
  let drafts = 0;
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const mode of Object.values(byMode)) {
    if (!mode) continue;
    drafts += mode.drafts;
    wins += mode.wins;
    losses += mode.losses;
    ties += mode.ties;
  }
  const decided = wins + losses;
  return {
    playerId,
    drafts,
    wins,
    losses,
    ties,
    winPct: decided > 0 ? wins / decided : null,
    byMode,
  };
};

export const listNbaPlayerUsageRows = (): NbaPlayerUsageRow[] => {
  backfillNbaPlayerUsageFromDailyScores();
  const store = loadNbaPlayerUsageStore();
  return Object.entries(store.byPlayerId)
    .map(([playerId, byMode]) => aggregatePlayer(playerId, byMode ?? {}))
    .sort((left, right) => {
      if (right.drafts !== left.drafts) {
        return right.drafts - left.drafts;
      }
      const leftPct = left.winPct ?? -1;
      const rightPct = right.winPct ?? -1;
      if (rightPct !== leftPct) {
        return rightPct - leftPct;
      }
      return left.playerId.localeCompare(right.playerId);
    });
};

export const getMostDraftedNbaPlayers = (
  limit = 10,
): NbaPlayerUsageRow[] => listNbaPlayerUsageRows().slice(0, Math.max(0, limit));

export const formatNbaPlayerWinPct = (winPct: number | null) =>
  winPct == null ? "—" : `${Math.round(winPct * 1000) / 10}%`;
