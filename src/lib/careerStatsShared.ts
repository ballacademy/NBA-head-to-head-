export interface ModeRecordStatsPayload {
  wins: number;
  losses: number;
  ties: number;
  winStreak: number;
  lossStreak: number;
}

export interface AllTimeBannersPayload {
  elo: number;
  peakElo: number;
  gamesPlayed: number;
}

export interface CareerStatsPayload {
  modes: {
    headToHead: ModeRecordStatsPayload;
    ranked: ModeRecordStatsPayload;
    allTime: ModeRecordStatsPayload;
  };
  allTimeBanners: AllTimeBannersPayload;
}

const emptyMode = (): ModeRecordStatsPayload => ({
  wins: 0,
  losses: 0,
  ties: 0,
  winStreak: 0,
  lossStreak: 0,
});

const emptyBanners = (): AllTimeBannersPayload => ({
  elo: 500,
  peakElo: 500,
  gamesPlayed: 0,
});

const asNonNegInt = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
};

const normalizeMode = (raw: unknown): ModeRecordStatsPayload => {
  if (!raw || typeof raw !== "object") {
    return emptyMode();
  }
  const row = raw as Record<string, unknown>;
  return {
    wins: asNonNegInt(row.wins),
    losses: asNonNegInt(row.losses),
    ties: asNonNegInt(row.ties),
    winStreak: asNonNegInt(row.winStreak),
    lossStreak: asNonNegInt(row.lossStreak),
  };
};

const normalizeBanners = (raw: unknown): AllTimeBannersPayload => {
  if (!raw || typeof raw !== "object") {
    return emptyBanners();
  }
  const row = raw as Record<string, unknown>;
  const elo = asNonNegInt(row.elo);
  const peakElo = Math.max(elo, asNonNegInt(row.peakElo));
  return {
    elo,
    peakElo,
    gamesPlayed: asNonNegInt(row.gamesPlayed),
  };
};

export const emptyCareerStats = (): CareerStatsPayload => ({
  modes: {
    headToHead: emptyMode(),
    ranked: emptyMode(),
    allTime: emptyMode(),
  },
  allTimeBanners: emptyBanners(),
});

export const normalizeCareerStats = (raw: unknown): CareerStatsPayload => {
  if (!raw || typeof raw !== "object") {
    return emptyCareerStats();
  }
  const row = raw as Record<string, unknown>;
  const modes =
    row.modes && typeof row.modes === "object"
      ? (row.modes as Record<string, unknown>)
      : row;

  return {
    modes: {
      headToHead: normalizeMode(modes.headToHead),
      ranked: normalizeMode(modes.ranked),
      allTime: normalizeMode(modes.allTime),
    },
    allTimeBanners: normalizeBanners(row.allTimeBanners),
  };
};

export const parseCareerJson = (raw: string): CareerStatsPayload => {
  try {
    return normalizeCareerStats(JSON.parse(raw) as unknown);
  } catch {
    return emptyCareerStats();
  }
};

const mergeMode = (
  left: ModeRecordStatsPayload,
  right: ModeRecordStatsPayload,
): ModeRecordStatsPayload => ({
  wins: Math.max(left.wins, right.wins),
  losses: Math.max(left.losses, right.losses),
  ties: Math.max(left.ties, right.ties),
  winStreak: Math.max(left.winStreak, right.winStreak),
  lossStreak: Math.max(left.lossStreak, right.lossStreak),
});

const mergeBanners = (
  left: AllTimeBannersPayload,
  right: AllTimeBannersPayload,
): AllTimeBannersPayload => {
  const peakElo = Math.max(left.peakElo, right.peakElo);
  const gamesPlayed = Math.max(left.gamesPlayed, right.gamesPlayed);
  const elo =
    left.gamesPlayed === right.gamesPlayed
      ? Math.max(left.elo, right.elo)
      : left.gamesPlayed > right.gamesPlayed
        ? left.elo
        : right.elo;

  return {
    elo: Math.max(0, elo),
    peakElo,
    gamesPlayed,
  };
};

/** Monotonic merge safe for cross-device sync (same spirit as unlock unions). */
export const mergeCareerStats = (
  ...list: CareerStatsPayload[]
): CareerStatsPayload => {
  let next = emptyCareerStats();
  for (const entry of list) {
    next = {
      modes: {
        headToHead: mergeMode(next.modes.headToHead, entry.modes.headToHead),
        ranked: mergeMode(next.modes.ranked, entry.modes.ranked),
        allTime: mergeMode(next.modes.allTime, entry.modes.allTime),
      },
      allTimeBanners: mergeBanners(next.allTimeBanners, entry.allTimeBanners),
    };
  }
  return next;
};
