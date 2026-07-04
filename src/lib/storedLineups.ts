export const REQUIRED_STORED_LINEUP_SIZE = 5;

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

export interface MatchmakingLineupSource {
  practiceMode?: boolean;
  allTimeMode?: boolean;
  isDailyDraft?: boolean;
  lineup: readonly (string | null | undefined)[];
}

export const canStoreLineupForMatchmaking = (
  source: MatchmakingLineupSource,
): boolean => {
  if (source.practiceMode || source.allTimeMode || source.isDailyDraft) {
    return false;
  }

  const lineup = sanitizeStoredLineupIds([...source.lineup]);
  return isValidStoredLineupIds(lineup);
};

export const parseGhostOpponentSnapshot = (payload: {
  id?: unknown;
  teamName?: unknown;
  lineup?: unknown;
  elo?: unknown;
  createdAt?: unknown;
}) => {
  const lineup = sanitizeStoredLineupIds(payload.lineup);

  if (
    typeof payload.id !== "string" ||
    typeof payload.teamName !== "string" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.elo !== "number" ||
    !isValidStoredLineupIds(lineup)
  ) {
    return null;
  }

  return {
    id: payload.id,
    teamName: payload.teamName,
    lineup,
    elo: payload.elo,
    createdAt: payload.createdAt,
  };
};
