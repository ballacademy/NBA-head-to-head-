export const REQUIRED_STORED_LINEUP_SIZE = 5;

/** PR #55 salary-cap draft fix merged 2026-06-28 ~04:55 UTC. */
export const STORED_LINEUP_SALARY_CAP_FIX_AT = "2026-06-28T05:00:00.000Z";

export const INVALID_STORED_LINEUP_CONSUMED_BY = "invalid-lineup-purge";

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
