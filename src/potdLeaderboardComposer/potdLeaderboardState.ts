import { measureTitleAdvance } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { NBA_ACTIVE_PLAYERS } from "../tierListComposer/nbaActivePlayers";
import {
  PLB_NAME_ADVANCE,
  PLB_ROW_SMALL,
  PLB_ROW_TRACK,
} from "./potdLeaderboardLayout";

export const POTD_LEADERBOARD_STORAGE_KEY = "ddgm:potd-leaderboard";

export const LEADERBOARD_MEDALS = {
  gold: "#ffd700",
  silver: "#c0c7d0",
  bronze: "#cd7f32",
} as const;

export type LeaderboardMedal = keyof typeof LEADERBOARD_MEDALS;

export const medalForRank = (
  rank: number | null,
): LeaderboardMedal | null => {
  if (rank === 1) {
    return "gold";
  }
  if (rank === 2) {
    return "silver";
  }
  if (rank === 3) {
    return "bronze";
  }
  return null;
};
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
  showPips?: boolean;
}

export interface RankedLeaderboardEntry extends LeaderboardEntry {
  rank: number | null;
  rankLabel: string;
  winsLabel: string;
  displayName: string;
  displayLines: string[];
  nameScale: number;
  teamId: string | null;
  headshotUrl: string | null;
}

export const POTD_BOARD_STORAGE_KEY = "ddgm:player-of-the-day-composer";

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
  showPips: true,
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

const nameAdvance = (text: string) => measureTitleAdvance(text, PLB_ROW_TRACK);

const nameFits = (text: string, maxAdvance: number, scale = 1) =>
  nameAdvance(text) * scale <= maxAdvance;

/** First name(s) on line one, last token on line two. */
export const splitLeaderboardName = (name: string): string[] => {
  const upper = name.replace(/\s+/g, " ").trim().toUpperCase();
  if (!upper) {
    return [];
  }
  const parts = upper.split(" ");
  if (parts.length < 2) {
    return [upper];
  }
  return [parts.slice(0, -1).join(" "), parts.at(-1)!];
};

/** Period-ellipsis only as a last resort for a single overflowing token. */
export const truncateLeaderboardName = (
  name: string,
  maxAdvance = PLB_NAME_ADVANCE,
  trackingEm = PLB_ROW_TRACK,
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

export const fitLeaderboardName = (
  name: string,
  maxAdvance = PLB_NAME_ADVANCE,
): { lines: string[]; scale: number } => {
  const upper = name.replace(/\s+/g, " ").trim().toUpperCase();
  if (!upper) {
    return { lines: [""], scale: 1 };
  }
  if (nameFits(upper, maxAdvance)) {
    return { lines: [upper], scale: 1 };
  }
  const split = splitLeaderboardName(upper);
  if (split.length > 1 && split.every((line) => nameFits(line, maxAdvance))) {
    return { lines: split, scale: 1 };
  }
  if (nameFits(upper, maxAdvance, PLB_ROW_SMALL)) {
    return { lines: [upper], scale: PLB_ROW_SMALL };
  }
  if (
    split.length > 1 &&
    split.every((line) => nameFits(line, maxAdvance, PLB_ROW_SMALL))
  ) {
    return { lines: split, scale: PLB_ROW_SMALL };
  }
  const scaledMax = maxAdvance / PLB_ROW_SMALL;
  return {
    lines: (split.length > 1 ? split : [upper]).map((line) =>
      nameFits(line, maxAdvance, PLB_ROW_SMALL)
        ? line
        : truncateLeaderboardName(line, scaledMax),
    ),
    scale: PLB_ROW_SMALL,
  };
};

export const playerForLeaderboardName = (name: string) => {
  const key = normalizePlayerNameKey(name);
  if (!key) {
    return null;
  }
  const exact = NBA_ACTIVE_PLAYERS.find(
    (player) => normalizePlayerNameKey(player.name) === key,
  );
  if (exact) {
    return exact;
  }
  const last = key.split(" ").at(-1);
  if (!last) {
    return null;
  }
  const lastHits = NBA_ACTIVE_PLAYERS.filter((player) => {
    const playerKey = normalizePlayerNameKey(player.name);
    return playerKey === last || playerKey.endsWith(` ${last}`);
  });
  return lastHits.length === 1 ? lastHits[0]! : null;
};

export const teamForLeaderboardName = (name: string): string | null =>
  playerForLeaderboardName(name)?.team ?? null;

export const headshotForLeaderboardName = (name: string): string | null =>
  playerForLeaderboardName(name)?.headshotUrl ?? null;

export const readPotdPairKeys = (): string[] => {
  const stored = readJson<{
    cards?: Array<{ firstName?: string; lastName?: string }>;
  }>(POTD_BOARD_STORAGE_KEY);
  if (!Array.isArray(stored?.cards)) {
    return [];
  }
  return stored.cards
    .map((card) =>
      normalizePlayerNameKey(`${card.firstName ?? ""} ${card.lastName ?? ""}`),
    )
    .filter(Boolean);
};

export const isPotdPairName = (name: string, keys: string[]) => {
  const key = normalizePlayerNameKey(name);
  return Boolean(key && keys.includes(key));
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
    const fitted = fitLeaderboardName(entry.name);
    return {
      ...entry,
      rank,
      rankLabel: tied ? `T${rank}.` : `${rank}.`,
      winsLabel: formatWinsLabel(entry.wins),
      displayName: fitted.lines.join(" "),
      displayLines: fitted.lines,
      nameScale: fitted.scale,
      teamId: teamForLeaderboardName(entry.name),
      headshotUrl: headshotForLeaderboardName(entry.name),
    };
  });
  const blanks = unnamed.map((entry) => ({
    ...entry,
    rank: null,
    rankLabel: "",
    winsLabel: formatWinsLabel(entry.wins),
    displayName: "",
    displayLines: [""],
    nameScale: 1,
    teamId: null as string | null,
    headshotUrl: null as string | null,
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
      showPips: stored.showPips !== false,
    };
  }
  return defaultLeaderboardDraft();
};

export const writeLeaderboardDraft = (draft: LeaderboardDraft) => {
  writeJson(POTD_LEADERBOARD_STORAGE_KEY, {
    title: draft.title,
    entries: draft.entries.slice(0, LEADERBOARD_MAX_ROWS),
    showBa: draft.showBa === true,
    showPips: draft.showPips !== false,
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

export const addNamedLeaderboardEntries = (names: string[]) => {
  const draft = readLeaderboardDraft();
  let entries = draft.entries;
  names.forEach((name) => {
    const trimmed = name.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      return;
    }
    const key = normalizePlayerNameKey(trimmed);
    if (entries.some((entry) => normalizePlayerNameKey(entry.name) === key)) {
      return;
    }
    entries = addLeaderboardEntry(entries, trimmed, 1);
  });
  writeLeaderboardDraft({ ...draft, entries });
  return entries;
};

/** First time a blank row gets a name, seed that player at 1 win. */
export const renameLeaderboardEntry = (
  entries: LeaderboardEntry[],
  id: string,
  name: string,
): LeaderboardEntry[] => {
  const trimmed = name.slice(0, LEADERBOARD_NAME_MAX);
  const nextKey = normalizePlayerNameKey(trimmed);
  const current = entries.find((entry) => entry.id === id);
  if (!current) {
    return entries;
  }
  const wasNamed = Boolean(normalizePlayerNameKey(current.name));
  const duplicate = Boolean(
    nextKey &&
      entries.some(
        (other) =>
          other.id !== id && normalizePlayerNameKey(other.name) === nextKey,
      ),
  );
  if (duplicate) {
    return entries;
  }
  return entries.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }
    const firstWin = !wasNamed && Boolean(nextKey) && entry.wins === 0;
    return {
      ...entry,
      name: trimmed,
      wins: firstWin ? 1 : entry.wins,
    };
  });
};

export const patchLeaderboardEntry = (
  entries: LeaderboardEntry[],
  id: string,
  patch: Partial<Pick<LeaderboardEntry, "name" | "wins">>,
): LeaderboardEntry[] => {
  if (patch.name !== undefined && patch.wins === undefined) {
    return renameLeaderboardEntry(entries, id, patch.name);
  }
  return entries.map((entry) =>
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
};

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
