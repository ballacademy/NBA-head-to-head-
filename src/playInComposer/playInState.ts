import type { RankingSlots, StandingRecord } from "../standingsComposer/rankingState";

export const DEFAULT_PLAY_IN_TITLE = "PLAY-IN TOURNAMENT";
export const PLAY_IN_SIZES = [8, 10] as const;
export type PlayInSize = (typeof PLAY_IN_SIZES)[number];

export const playInSeeds = (size: PlayInSize) =>
  size === 10 ? [6, 7, 8, 9, 10] : [7, 8, 9, 10];

export interface PlayInGameScores {
  sevenEight: [string, string];
  nineTen: [string, string];
}

export interface PlayInDraft {
  title: string;
  size: PlayInSize;
  east: Array<string | null>;
  west: Array<string | null>;
  showBa?: boolean;
  showWl?: boolean;
  records?: Record<string, StandingRecord>;
  eastScores?: PlayInGameScores;
  westScores?: PlayInGameScores;
}

export const parsePlayInSize = (value: unknown): PlayInSize =>
  value === 10 ? 10 : 8;

export const emptySide = (size: PlayInSize): Array<string | null> =>
  playInSeeds(size).map(() => null);

export const emptyPlayInScores = (): PlayInGameScores => ({
  sevenEight: ["", ""],
  nineTen: ["", ""],
});

export const parsePlayInScores = (value: unknown): PlayInGameScores => {
  const empty = emptyPlayInScores();
  if (!value || typeof value !== "object") {
    return empty;
  }
  const raw = value as Partial<PlayInGameScores>;
  const pair = (item: unknown): [string, string] => {
    if (!Array.isArray(item) || item.length < 2) {
      return ["", ""];
    }
    return [
      typeof item[0] === "string" ? item[0].slice(0, 4) : "",
      typeof item[1] === "string" ? item[1].slice(0, 4) : "",
    ];
  };
  return {
    sevenEight: pair(raw.sevenEight),
    nineTen: pair(raw.nineTen),
  };
};

export const resizeSide = (
  slots: Array<string | null> | undefined,
  size: PlayInSize,
): Array<string | null> => {
  const next = emptySide(size);
  (slots ?? []).slice(0, next.length).forEach((id, index) => {
    next[index] = id ?? null;
  });
  return next;
};

export const isPlayInDraft = (value: unknown): value is PlayInDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as PlayInDraft).title === "string" &&
      Array.isArray((value as PlayInDraft).east) &&
      Array.isArray((value as PlayInDraft).west),
  );

export const defaultPlayInDraft = (): PlayInDraft => ({
  title: DEFAULT_PLAY_IN_TITLE,
  size: 8,
  east: emptySide(8),
  west: emptySide(8),
  showBa: true,
  showWl: false,
  records: {},
  eastScores: emptyPlayInScores(),
  westScores: emptyPlayInScores(),
});

export const normalizePlayInDraft = (draft: PlayInDraft): PlayInDraft => {
  const size = parsePlayInSize(draft.size);
  return {
    ...draft,
    size,
    east: resizeSide(draft.east, size),
    west: resizeSide(draft.west, size),
    showBa: draft.showBa !== false,
    showWl: draft.showWl === true,
    records: draft.records ?? {},
    eastScores: parsePlayInScores(draft.eastScores),
    westScores: parsePlayInScores(draft.westScores),
  };
};

export const parseScore = (value: string): number | null => {
  const token = value.trim();
  if (!token) {
    return null;
  }
  const n = Number(token);
  return Number.isFinite(n) ? n : null;
};

export const scoreWinnerIndex = (scores: [string, string]): 0 | 1 | null => {
  const a = parseScore(scores[0] ?? "");
  const b = parseScore(scores[1] ?? "");
  if (a == null || b == null || a === b) {
    return null;
  }
  return a > b ? 0 : 1;
};

export const playInSlotsFromStandings = (
  size: PlayInSize,
  slots: RankingSlots,
): Array<string | null> =>
  playInSeeds(size).map((seed) => slots[seed - 1] ?? null);

export const seedIndex = (size: PlayInSize, seed: number) =>
  playInSeeds(size).indexOf(seed);

export const nineTenWinnerId = (
  ids: Array<string | null>,
  size: PlayInSize,
  scores: PlayInGameScores | undefined,
): string | null => {
  const winner = scoreWinnerIndex(scores?.nineTen ?? ["", ""]);
  if (winner == null) {
    return null;
  }
  const index = seedIndex(size, winner === 0 ? 9 : 10);
  return index >= 0 ? ids[index] ?? null : null;
};

export const slotScore = (
  size: PlayInSize,
  seed: number,
  scores: PlayInGameScores | undefined,
): string => {
  if (!scores) {
    return "";
  }
  if (seed === 7) {
    return scores.sevenEight[0] ?? "";
  }
  if (seed === 8) {
    return scores.sevenEight[1] ?? "";
  }
  if (seed === 9) {
    return scores.nineTen[0] ?? "";
  }
  if (seed === 10) {
    return scores.nineTen[1] ?? "";
  }
  return "";
};

export const patchPlayInScore = (
  scores: PlayInGameScores,
  game: "sevenEight" | "nineTen",
  index: 0 | 1,
  value: string,
): PlayInGameScores => {
  const next = [...scores[game]] as [string, string];
  next[index] = value.replace(/[^\d]/g, "").slice(0, 3);
  return { ...scores, [game]: next };
};
