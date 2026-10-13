import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
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

export interface RankedLineupsDraft {
  brand: string;
  title: string;
  rank: string;
  strips: TotwStrip[];
  showBa?: boolean;
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

export const defaultRankedLineupsDraft = (): RankedLineupsDraft => ({
  brand: DEFAULT_BRAND,
  title: DEFAULT_RANKED_LINEUP_TITLE,
  rank: DEFAULT_RANK_PILL,
  strips: createEmptyStrips(),
  showBa: false,
});
