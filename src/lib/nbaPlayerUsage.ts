import { readJson, writeJson } from "./browserStorage";
import { getOrCreatePlayerId, type HeadToHeadResult } from "./playerRecord";
import type {
  NbaPlayerModeUsage,
  NbaPlayerUsageMode,
  NbaPlayerUsageStore,
} from "./nbaPlayerUsageShared";
import {
  MAX_NBA_PLAYER_USAGE_RECORDED_KEYS,
  normalizeNbaPlayerUsageStore,
} from "./nbaPlayerUsageShared";

export type { NbaPlayerModeUsage, NbaPlayerUsageMode, NbaPlayerUsageStore };

const USAGE_KEY = "nba-head-to-head-nba-player-usage";
const DAILY_SCORES_KEY = "nba-head-to-head-daily-scores";
const MAX_RECORDED_KEYS = MAX_NBA_PLAYER_USAGE_RECORDED_KEYS;

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
  return normalizeNbaPlayerUsageStore(saved);
};

const pushUsageIfLinked = () => {
  void import("./nbaPlayerUsageRemote")
    .then(({ pushNbaPlayerUsageIfLinked }) => pushNbaPlayerUsageIfLinked())
    .catch(() => undefined);
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
  pushUsageIfLinked();
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
  pushUsageIfLinked();
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
  if (applied > 0) {
    pushUsageIfLinked();
  }
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

/** Modes shown on the public Most drafted boards. */
export type MostDraftedBoardMode = "headToHead" | "ranked" | "daily" | "event";

export const MOST_DRAFTED_BOARD_LABELS: Record<MostDraftedBoardMode, string> = {
  headToHead: "Casual",
  ranked: "Pro",
  daily: "Daily",
  event: "Events",
};

const MIN_LINEUPS_FOR_MOST_DRAFTED = 2;

/** How many distinct drafted lineups have been recorded for this GM. */
export const getRecordedDraftLineupCount = (): number => {
  backfillNbaPlayerUsageFromDailyScores();
  return loadNbaPlayerUsageStore().recordedKeys.length;
};

export const canShowMostDraftedBoards = () =>
  getRecordedDraftLineupCount() >= MIN_LINEUPS_FOR_MOST_DRAFTED;

export interface MostDraftedModeRow {
  playerId: string;
  drafts: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number | null;
}

/** Top drafted NBA players within one mode (Casual / Pro / Daily / Events). */
export const getMostDraftedNbaPlayersForMode = (
  mode: MostDraftedBoardMode,
  limit = 10,
): MostDraftedModeRow[] => {
  backfillNbaPlayerUsageFromDailyScores();
  const store = loadNbaPlayerUsageStore();

  return Object.entries(store.byPlayerId)
    .map(([playerId, byMode]) => {
      const modeRow = byMode?.[mode];
      if (!modeRow || modeRow.drafts <= 0) {
        return null;
      }
      const decided = modeRow.wins + modeRow.losses;
      return {
        playerId,
        drafts: modeRow.drafts,
        wins: modeRow.wins,
        losses: modeRow.losses,
        ties: modeRow.ties,
        winPct: decided > 0 ? modeRow.wins / decided : null,
      } satisfies MostDraftedModeRow;
    })
    .filter((row): row is MostDraftedModeRow => row != null)
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
    })
    .slice(0, Math.max(0, limit));
};

export const formatNbaPlayerWinPct = (winPct: number | null) =>
  winPct == null ? "—" : `${Math.round(winPct * 1000) / 10}%`;

/** Min decided (W+L) games before showing personal hit rate on Most Drafted. */
export const MIN_DECIDED_FOR_PERSONAL_HIT_RATE = 3;

/** Personal hit rate is Casual/Pro/Events — Daily has no W/L. */
export const canShowPersonalHitRate = (
  mode: MostDraftedBoardMode,
  row: Pick<MostDraftedModeRow, "wins" | "losses" | "winPct">,
) =>
  mode !== "daily" &&
  row.winPct != null &&
  row.wins + row.losses >= MIN_DECIDED_FOR_PERSONAL_HIT_RATE;

export const formatPersonalHitRateMeta = (
  mode: MostDraftedBoardMode,
  row: Pick<MostDraftedModeRow, "drafts" | "wins" | "losses" | "winPct">,
) => {
  const draftsLabel = `${row.drafts} draft${row.drafts === 1 ? "" : "s"}`;
  if (!canShowPersonalHitRate(mode, row)) {
    return draftsLabel;
  }

  return `${draftsLabel} · Your hit rate ${formatNbaPlayerWinPct(row.winPct)}`;
};
