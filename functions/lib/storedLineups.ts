export const REQUIRED_STORED_LINEUP_SIZE = 5;

/** PR #55 salary-cap draft fix merged 2026-06-28 ~04:55 UTC. */
export const STORED_LINEUP_SALARY_CAP_FIX_AT = "2026-06-28T05:00:00.000Z";

export const INVALID_STORED_LINEUP_CONSUMED_BY = "invalid-lineup-purge";
export const OVER_CAP_STORED_LINEUP_CONSUMED_BY = "over-cap-lineup-purge";
export const STAR_GAP_STORED_LINEUP_SKIPPED_BY = "star-gap-skip";

/** Block stored opponents with 7+ more unlocked stars than the challenger. */
export const MAX_STORED_OPPONENT_STAR_GAP = 6;

export const RANKED_STORED_LINEUP_SALARY_CAP = 100_000_000;
export const CLASSIC_STORED_LINEUP_SALARY_CAP = 150_000_000;

export const sanitizeStoredLineupIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter(Boolean);
};

export const isValidStoredLineupIds = (lineup: string[]) =>
  lineup.length === REQUIRED_STORED_LINEUP_SIZE &&
  new Set(lineup).size === REQUIRED_STORED_LINEUP_SIZE;

export const parseStoredLineupJson = (lineupJson: string): string[] => {
  try {
    return sanitizeStoredLineupIds(JSON.parse(lineupJson));
  } catch {
    return [];
  }
};

export const salaryCapForMatchmakingMode = (mode: string) =>
  mode === "ranked"
    ? RANKED_STORED_LINEUP_SALARY_CAP
    : CLASSIC_STORED_LINEUP_SALARY_CAP;

export const isStoredLineupWithinSalaryCap = (
  mode: string,
  salaryTotal: number | null | undefined,
) => {
  if (salaryTotal == null || !Number.isFinite(salaryTotal)) {
    return false;
  }

  return salaryTotal <= salaryCapForMatchmakingMode(mode);
};

export const isStoredLineupWithinStarGap = (
  challengerStarCount: number,
  opponentStarCount: number | null | undefined,
  maxGap = MAX_STORED_OPPONENT_STAR_GAP,
) => {
  if (opponentStarCount == null || !Number.isFinite(opponentStarCount)) {
    return false;
  }

  return opponentStarCount <= challengerStarCount + maxGap;
};
