import {
  CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
  getLineupSalaryTotal,
  RANKED_SALARY_CAP,
} from "./salaryCap";
import type { Player } from "./types";

export const REQUIRED_STORED_LINEUP_SIZE = 5;

/** Block stored opponents with 7+ more unlocked stars than the challenger. */
export const MAX_STORED_OPPONENT_STAR_GAP = 6;

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
  salaryCapMode?: boolean;
  salaryCapLimit?: number;
  lineup: readonly (string | null | undefined)[];
  /** Resolved players for the lineup ids, when available for cap checks. */
  players?: readonly Player[];
}

export const salaryCapForStoredLineup = (source: {
  salaryCapMode?: boolean;
  salaryCapLimit?: number;
}) => {
  if (typeof source.salaryCapLimit === "number") {
    return source.salaryCapLimit;
  }

  return source.salaryCapMode
    ? RANKED_SALARY_CAP
    : CLASSIC_HEAD_TO_HEAD_SALARY_CAP;
};

export const canStoreLineupForMatchmaking = (
  source: MatchmakingLineupSource,
): boolean => {
  if (source.practiceMode || source.allTimeMode || source.isDailyDraft) {
    return false;
  }

  const lineup = sanitizeStoredLineupIds([...source.lineup]);
  if (!isValidStoredLineupIds(lineup)) {
    return false;
  }

  if (source.players && source.players.length === REQUIRED_STORED_LINEUP_SIZE) {
    const cap = salaryCapForStoredLineup(source);
    if (getLineupSalaryTotal([...source.players]) > cap) {
      return false;
    }
  }

  return true;
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
