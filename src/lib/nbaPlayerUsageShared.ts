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
  recordedKeys: string[];
  dailyBackfillDone?: boolean;
  dailyLineups?: Record<string, string[]>;
}

export const MAX_NBA_PLAYER_USAGE_RECORDED_KEYS = 200;

const emptyMode = (): NbaPlayerModeUsage => ({
  drafts: 0,
  wins: 0,
  losses: 0,
  ties: 0,
});

export const emptyNbaPlayerUsageStore = (): NbaPlayerUsageStore => ({
  version: 1,
  byPlayerId: {},
  recordedKeys: [],
  dailyBackfillDone: false,
  dailyLineups: {},
});

const asNonNegInt = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
};

const sanitizeMode = (value: unknown): NbaPlayerModeUsage => {
  if (!value || typeof value !== "object") {
    return emptyMode();
  }

  const row = value as Partial<NbaPlayerModeUsage>;
  return {
    drafts: asNonNegInt(row.drafts),
    wins: asNonNegInt(row.wins),
    losses: asNonNegInt(row.losses),
    ties: asNonNegInt(row.ties),
  };
};

const uniquePlayerIds = (playerIds: string[]) =>
  [...new Set(playerIds.filter((id) => typeof id === "string" && id.length > 0))];

export const normalizeNbaPlayerUsageStore = (raw: unknown): NbaPlayerUsageStore => {
  if (!raw || typeof raw !== "object") {
    return emptyNbaPlayerUsageStore();
  }

  const saved = raw as Partial<NbaPlayerUsageStore>;
  if (saved.version !== 1 || typeof saved.byPlayerId !== "object") {
    return emptyNbaPlayerUsageStore();
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
    recordedKeys: [...new Set(recordedKeys)].slice(
      0,
      MAX_NBA_PLAYER_USAGE_RECORDED_KEYS,
    ),
    dailyBackfillDone: Boolean(saved.dailyBackfillDone),
    dailyLineups,
  };
};

export const parseNbaPlayerUsageJson = (raw: string): NbaPlayerUsageStore => {
  try {
    return normalizeNbaPlayerUsageStore(JSON.parse(raw) as unknown);
  } catch {
    return emptyNbaPlayerUsageStore();
  }
};

/**
 * Pick one whole usage row — never Math.max wins/losses independently
 * (that invents outcomes that never happened across devices).
 */
const mergeModeUsage = (
  left: NbaPlayerModeUsage,
  right: NbaPlayerModeUsage,
): NbaPlayerModeUsage => {
  if (left.drafts !== right.drafts) {
    return left.drafts > right.drafts ? left : right;
  }

  if (
    left.wins === right.wins &&
    left.losses === right.losses &&
    left.ties === right.ties
  ) {
    return left;
  }

  if (left.wins !== right.wins) {
    return left.wins > right.wins ? left : right;
  }

  return left;
};

const mergeDailyLineups = (
  left: Record<string, string[]>,
  right: Record<string, string[]>,
) => {
  const merged: Record<string, string[]> = { ...left };
  for (const [key, lineup] of Object.entries(right)) {
    const existing = merged[key];
    if (!existing || lineup.length >= existing.length) {
      merged[key] = uniquePlayerIds(lineup);
    }
  }
  return merged;
};

/** Monotonic merge safe for cross-device sync (same spirit as career stats). */
export const mergeNbaPlayerUsageStore = (
  ...stores: NbaPlayerUsageStore[]
): NbaPlayerUsageStore => {
  let next = emptyNbaPlayerUsageStore();

  for (const store of stores) {
    const normalized = normalizeNbaPlayerUsageStore(store);
    next.dailyBackfillDone =
      next.dailyBackfillDone || normalized.dailyBackfillDone;
    next.dailyLineups = mergeDailyLineups(
      next.dailyLineups ?? {},
      normalized.dailyLineups ?? {},
    );
    next.recordedKeys = [
      ...new Set([...next.recordedKeys, ...normalized.recordedKeys]),
    ].slice(0, MAX_NBA_PLAYER_USAGE_RECORDED_KEYS);

    for (const [playerId, modes] of Object.entries(normalized.byPlayerId)) {
      const current = next.byPlayerId[playerId] ?? {};
      const mergedModes: Partial<Record<NbaPlayerUsageMode, NbaPlayerModeUsage>> =
        { ...current };

      for (const mode of [
        "daily",
        "headToHead",
        "ranked",
        "allTime",
        "event",
      ] as const) {
        if (!modes?.[mode]) {
          continue;
        }

        mergedModes[mode] = mergeModeUsage(
          mergedModes[mode] ?? emptyMode(),
          modes[mode]!,
        );
      }

      if (Object.keys(mergedModes).length > 0) {
        next.byPlayerId[playerId] = mergedModes;
      }
    }
  }

  return next;
};
