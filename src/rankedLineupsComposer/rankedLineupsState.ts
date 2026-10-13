import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import type { RankDisplay } from "./rankedLineupsLayout";
import {
  applyPlayerPick,
  clearStrip,
  createEmptyStrips,
  hasCustomPhoto,
  isTotwStrip,
  patchStrip,
  setStripPhoto,
  splitPlayerName,
  stripPlayerName,
  type TotwStrip,
} from "../teamOfTheWeekComposer/teamOfTheWeekState";

export {
  applyPlayerPick,
  clearStrip,
  createEmptyStrips,
  DEFAULT_BRAND,
  hasCustomPhoto,
  patchStrip,
  setStripPhoto,
  splitPlayerName,
  stripPlayerName,
  type TotwStrip as RankedLineupStrip,
};

export const RANKED_LINEUP_STRIP_COUNT = 5;
export const LINEUP_POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;
export type LineupPosition = (typeof LINEUP_POSITIONS)[number];

export const DEFAULT_RANKED_LINEUP_TITLE =
  "TOP 10 NBA PLAYERS AT EACH POSITION";
export const RANKED_LINEUP_TITLE_TRACK = 0.02;
export const DEFAULT_RANK_PILL = "BEST";
export const RANK_PILL_MAX = 12;
export const RANK_HEADLINE_TOTAL = 10;
export type { RankDisplay };
export const DEFAULT_RANK_DISPLAY: RankDisplay = "pill";

export const RANK_PILL_PRESETS = [
  "BEST",
  "2ND",
  "3RD",
  "4TH",
  "5TH",
  "6TH",
  "7TH",
  "8TH",
  "9TH",
  "10TH",
] as const;

export interface RankedLineupSlide {
  rank: string;
  strips: TotwStrip[];
}

export interface RankedLineupsDraft {
  brand: string;
  title: string;
  rank: string;
  strips: TotwStrip[];
  slides?: RankedLineupSlide[];
  activeSlide?: number;
  showBa?: boolean;
  showFade?: boolean;
  rankDisplay?: RankDisplay;
}

export const lineupPosition = (index: number): LineupPosition =>
  LINEUP_POSITIONS[index] ?? "PG";

export const splitRankedLineupTitle = (title: string): string[] =>
  splitBalancedTitle(
    title,
    DEFAULT_RANKED_LINEUP_TITLE,
    RANKED_LINEUP_TITLE_TRACK,
  );

export const isRankedLineupsDraft = (
  value: unknown,
): value is RankedLineupsDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as RankedLineupsDraft).brand === "string" &&
      typeof (value as RankedLineupsDraft).title === "string" &&
      typeof (value as RankedLineupsDraft).rank === "string" &&
      Array.isArray((value as RankedLineupsDraft).strips) &&
      (value as RankedLineupsDraft).strips.length ===
        RANKED_LINEUP_STRIP_COUNT &&
      (value as RankedLineupsDraft).strips.every(isTotwStrip),
  );

export const usedLineupPlayerIds = (strips: TotwStrip[]) => {
  const used: Record<string, string> = {};
  strips.forEach((strip, index) => {
    if (strip.playerId) {
      used[strip.playerId] = lineupPosition(index);
    }
  });
  return used;
};

export const defaultRankedLineupsDraft = (): RankedLineupsDraft => {
  const slide = emptyLineupSlide();
  return {
    brand: DEFAULT_BRAND,
    title: DEFAULT_RANKED_LINEUP_TITLE,
    rank: slide.rank,
    strips: slide.strips,
    slides: [slide],
    activeSlide: 0,
    showBa: false,
    showFade: false,
    rankDisplay: DEFAULT_RANK_DISPLAY,
  };
};

export const parseRankDisplay = (value: unknown): RankDisplay =>
  value === "headline" ? "headline" : "pill";

export const rankOrdinalNumber = (rank: string) => {
  const upper = rank.trim().toUpperCase() || DEFAULT_RANK_PILL;
  const preset = (RANK_PILL_PRESETS as readonly string[]).indexOf(upper);
  if (preset >= 0) {
    return preset + 1;
  }
  const digits = upper.match(/(\d+)/);
  if (digits) {
    return Number(digits[1]);
  }
  return 1;
};

export const rankHeadlinePrimary = (rank: string) =>
  `#${rankOrdinalNumber(rank)}`;

export const rankHeadlineSecondary = (
  rank: string,
  total = RANK_HEADLINE_TOTAL,
) => `${rankOrdinalNumber(rank)} OF ${total}`;

export const isRankedLineupSlide = (value: unknown): value is RankedLineupSlide =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as RankedLineupSlide).rank === "string" &&
      Array.isArray((value as RankedLineupSlide).strips) &&
      (value as RankedLineupSlide).strips.length === RANKED_LINEUP_STRIP_COUNT &&
      (value as RankedLineupSlide).strips.every(isTotwStrip),
  );

const ordinalPill = (value: number) => {
  const teen = value % 100;
  if (teen >= 11 && teen <= 13) {
    return `${value}TH`;
  }
  switch (value % 10) {
    case 1:
      return `${value}ST`;
    case 2:
      return `${value}ND`;
    case 3:
      return `${value}RD`;
    default:
      return `${value}TH`;
  }
};

export const nextRankPill = (rank: string) => {
  const upper = rank.trim().toUpperCase() || DEFAULT_RANK_PILL;
  const preset = (RANK_PILL_PRESETS as readonly string[]).indexOf(upper);
  if (preset >= 0 && preset < RANK_PILL_PRESETS.length - 1) {
    return RANK_PILL_PRESETS[preset + 1]!;
  }
  const digits = upper.match(/^(\d+)/);
  if (digits) {
    return ordinalPill(Number(digits[1]) + 1);
  }
  return "2ND";
};

export const emptyLineupSlide = (rank = DEFAULT_RANK_PILL): RankedLineupSlide => ({
  rank,
  strips: createEmptyStrips(),
});

export const slidesFromDraft = (
  draft: Pick<RankedLineupsDraft, "rank" | "strips" | "slides">,
): RankedLineupSlide[] => {
  if (Array.isArray(draft.slides) && draft.slides.length > 0 && draft.slides.every(isRankedLineupSlide)) {
    return draft.slides;
  }
  return [{ rank: draft.rank, strips: draft.strips }];
};

export const clampActiveSlide = (slides: RankedLineupSlide[], index: number) =>
  Math.max(0, Math.min(slides.length - 1, index));

export const withActiveSlide = (
  draft: RankedLineupsDraft,
  slides: RankedLineupSlide[],
  activeSlide: number,
): RankedLineupsDraft => {
  const index = clampActiveSlide(slides, activeSlide);
  const slide = slides[index] ?? emptyLineupSlide(draft.rank);
  return {
    ...draft,
    slides,
    activeSlide: index,
    rank: slide.rank,
    strips: slide.strips,
  };
};
