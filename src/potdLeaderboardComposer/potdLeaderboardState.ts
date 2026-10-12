import { measureTitleAdvance } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";

export const POTD_LEADERBOARD_STORAGE_KEY = "ddgm:potd-leaderboard";
export const POTD_LEADERBOARD_EVENT = "ddgm:potd-leaderboard";
export const DEFAULT_POTD_LEADERBOARD_TITLE = "POTD LEADERBOARD";
export const LEADERBOARD_MAX_ROWS = 24;
export const LEADERBOARD_NAME_MAX = 40;

export interface LeaderboardEntry {
  id: string;
  name: string;
  wins: number;
}

export interface LeaderboardDraft {
  title: string;
  entries: LeaderboardEntry[];
  showBa?: boolean;
}

export interface RankedLeaderboardEntry extends LeaderboardEntry {
  rank: number | null;
  rankLabel: string;
  winsLabel: string;
  displayName: string;
}

let entrySeq = 0;

export const newLeaderboardEntryId = () => {
  entrySeq += 1;
  return `plb-${Date.now().toString(36)}-${entrySeq}`;
};

export const createLeaderboardEntry = (
  name = "",
  wins = 0,
): LeaderboardEntry => ({
  id: newLeaderboardEntryId(),
  name,
  wins: Math.max(0, Math.round(Number(wins) || 0)),
});

export const defaultLeaderboardDraft = (): LeaderboardDraft => ({
  title: DEFAULT_POTD_LEADERBOARD_TITLE,
  entries: [],
});

export const normalizePlayerNameKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

export const parseWinsInput = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) {
    return 0;
  }
  return Math.min(999, Number(digits));
};

export const formatWinsLabel = (wins: number) => `(${Math.max(0, wins)})`;

/** Truncate long names with a period, matching the example (GIANNIS ANTETOKO.). */
export const truncateLeaderboardName = (
  name: string,
  maxAdvance = 10.24,
  trackingEm = 0.02,
) => {
  const upper = name.replace(/\s+/g, " ").trim().toUpperCase();
  if (!upper) {
    return "";
  }
  if (measureTitleAdvance(upper, trackingEm) <= maxAdvance) {
    return upper;
  }
  let fit = "";
  for (let index = 1; index <= upper.length; index += 1) {
    const candidate = `${upper.slice(0, index).trimEnd()}.`;
    if (measureTitleAdvance(candidate, trackingEm) <= maxAdvance) {
      fit = candidate;
    } else {
      break;
    }
  }
  return fit || ".";
};

export const rankLeaderboard = (
  entries: LeaderboardEntry[],
): RankedLeaderboardEntry[] => {
  const named: LeaderboardEntry[] = [];
  const unnamed: LeaderboardEntry[] = [];
  entries.forEach((entry) => {
    if (entry.name.trim()) {
      named.push(entry);
    } else {
      unnamed.push(entry);
    }
  });
  const sorted = named.slice().sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }
    return 0;
  });
  const countByWins = new Map<number, number>();
  sorted.forEach((entry) => {
    countByWins.set(entry.wins, (countByWins.get(entry.wins) ?? 0) + 1);
  });
  const ranked = sorted.map((entry) => {
    const better = sorted.filter((other) => other.wins > entry.wins).length;
    const rank = better + 1;
    const tied = (countByWins.get(entry.wins) ?? 1) > 1;
    return {
      ...entry,
      rank,
      rankLabel: tied ? `T${rank}.` : `${rank}.`,
      winsLabel: formatWinsLabel(entry.wins),
      displayName: truncateLeaderboardName(entry.name),
    };
  });
  const blanks = unnamed.map((entry) => ({
    ...entry,
    rank: null,
    rankLabel: "",
    winsLabel: formatWinsLabel(entry.wins),
    displayName: "",
  }));
  return [...ranked, ...blanks];
};

export const winsForName = (
  name: string,
  entries: LeaderboardEntry[],
): number => {
  const key = normalizePlayerNameKey(name);
  if (!key) {
    return 0;
  }
  const hit = entries.find(
    (entry) => normalizePlayerNameKey(entry.name) === key,
  );
  return hit ? hit.wins : 0;
};

export const isLeaderboardEntry = (value: unknown): value is LeaderboardEntry =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as LeaderboardEntry).id === "string" &&
      typeof (value as LeaderboardEntry).name === "string" &&
      Number.isFinite((value as LeaderboardEntry).wins),
  );

export const isLeaderboardDraft = (value: unknown): value is LeaderboardDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as LeaderboardDraft).title === "string" &&
      Array.isArray((value as LeaderboardDraft).entries) &&
      (value as LeaderboardDraft).entries.every(isLeaderboardEntry),
  );

export const readLeaderboardDraft = (): LeaderboardDraft => {
  const stored = readJson<Partial<LeaderboardDraft>>(POTD_LEADERBOARD_STORAGE_KEY);
  if (isLeaderboardDraft(stored)) {
    return {
      title: stored.title.trim() || DEFAULT_POTD_LEADERBOARD_TITLE,
      entries: stored.entries.slice(0, LEADERBOARD_MAX_ROWS).map((entry) => ({
        ...entry,
        wins: Math.max(0, Math.round(entry.wins)),
      })),
      showBa: stored.showBa === true,
    };
  }
  return defaultLeaderboardDraft();
};

export const writeLeaderboardDraft = (draft: LeaderboardDraft) => {
  writeJson(POTD_LEADERBOARD_STORAGE_KEY, {
    title: draft.title,
    entries: draft.entries.slice(0, LEADERBOARD_MAX_ROWS),
    showBa: draft.showBa === true,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(POTD_LEADERBOARD_EVENT));
  }
};

export const subscribeLeaderboard = (onChange: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === POTD_LEADERBOARD_STORAGE_KEY) {
      onChange();
    }
  };
  window.addEventListener(POTD_LEADERBOARD_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(POTD_LEADERBOARD_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
};

export const addLeaderboardEntry = (
  entries: LeaderboardEntry[],
  name = "",
  wins = 0,
): LeaderboardEntry[] => {
  if (entries.length >= LEADERBOARD_MAX_ROWS) {
    return entries;
  }
  return [...entries, createLeaderboardEntry(name, wins)];
};

export const patchLeaderboardEntry = (
  entries: LeaderboardEntry[],
  id: string,
  patch: Partial<Pick<LeaderboardEntry, "name" | "wins">>,
): LeaderboardEntry[] =>
  entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          name:
            patch.name === undefined
              ? entry.name
              : patch.name.slice(0, LEADERBOARD_NAME_MAX),
          wins:
            patch.wins === undefined
              ? entry.wins
              : Math.max(0, Math.round(patch.wins)),
        }
      : entry,
  );

export const removeLeaderboardEntry = (
  entries: LeaderboardEntry[],
  id: string,
): LeaderboardEntry[] => entries.filter((entry) => entry.id !== id);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const exportLeaderboardFilename = (title: string) => {
  const stem = slugify(title) || "potd-leaderboard";
  return `${stem}.png`;
};
