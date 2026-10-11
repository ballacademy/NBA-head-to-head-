import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

/** Board-space (1200×1500) layout shared by the on-screen graphic and PNG. */
export const TIER_HEADER_H = 248;
export const TIER_FOOTER = 16;
export const TIER_LABEL_W = 140;
export const TIER_CELLS_INSET = 12;
export const TIER_PAD_RIGHT = 32;
export const TIER_CELL_GAP = 8;
export const TIER_CELL_MAX = 148;
/** Logos stay this wide; extra items wrap onto another lane in the same tier. */
export const TIER_WRAP_COLS = 8;
export const TIER_ROW_PAD_Y = 12;
/** Circled BA lockup (white ring + letters). Letters-only mark is `/ba-logo.png`. */
export const BA_LOGO_SRC = "/ba-logo-circled.png";
export const TIER_BADGE_SIZE = 108;
/**
 * Equal inset from the graphic’s top edge and right edge so the lockup is
 * not hugging the right. Matches the header’s vertical centering gap.
 */
export const TIER_BADGE_INSET = (TIER_HEADER_H - TIER_BADGE_SIZE) / 2;
export const TIER_TITLE_SIZE = 54;
/** Faded team-logo backdrop behind a player headshot. */
export const PLAYER_LOGO_WATERMARK_ALPHA = 0.22;
export const PLAYER_LOGO_WATERMARK_OVERSCAN = 0.14;
export const TIER_TITLE_TRACK = 0.04;

export const cellsContentWidth = () =>
  GRAPHIC_WIDTH - TIER_LABEL_W - TIER_CELLS_INSET - TIER_PAD_RIGHT;

export const rowMetrics = (rowCount: number) => {
  const count = Math.max(1, rowCount);
  const bodyH = GRAPHIC_HEIGHT - TIER_HEADER_H - TIER_FOOTER;
  const rowH = bodyH / count;
  return { bodyH, rowH };
};

/** How many vertical lanes a tier needs so items wrap at 8 per row. */
export const tierLaneCount = (itemCount: number) =>
  Math.max(1, Math.ceil(Math.max(0, itemCount) / TIER_WRAP_COLS));

export const cellSize = (
  laneH: number,
  contentW: number,
  slotCount = TIER_WRAP_COLS,
) => {
  const cols = Math.min(TIER_WRAP_COLS, Math.max(1, slotCount));
  const innerH = Math.max(28, laneH - TIER_ROW_PAD_Y * 2);
  const availableW = contentW - TIER_CELL_GAP * (cols - 1);
  return Math.max(28, Math.min(TIER_CELL_MAX, innerH, availableW / cols));
};

export interface TierBoardLayout {
  lanes: number[];
  totalLanes: number;
  bodyH: number;
  laneH: number;
  size: number;
  contentW: number;
  gridTemplate: string;
}

export const tierBoardLayout = (itemCounts: number[]): TierBoardLayout => {
  const lanes = itemCounts.map((count) => tierLaneCount(count));
  const totalLanes = Math.max(1, lanes.reduce((sum, count) => sum + count, 0));
  const bodyH = GRAPHIC_HEIGHT - TIER_HEADER_H - TIER_FOOTER;
  const laneH = bodyH / totalLanes;
  const contentW = cellsContentWidth();
  const size = cellSize(laneH, contentW, TIER_WRAP_COLS);
  return {
    lanes,
    totalLanes,
    bodyH,
    laneH,
    size,
    contentW,
    gridTemplate: lanes.map((count) => `${count}fr`).join(" "),
  };
};

export const cellGridPosition = (index: number) => ({
  col: index % TIER_WRAP_COLS,
  wrapRow: Math.floor(index / TIER_WRAP_COLS),
});

export const baBadgeRect = () => ({
  x: GRAPHIC_WIDTH - TIER_BADGE_INSET - TIER_BADGE_SIZE,
  y: TIER_BADGE_INSET,
  size: TIER_BADGE_SIZE,
});

export const labelFontSize = (label: string) => {
  const len = Math.max(1, label.trim().length);
  if (len <= 1) {
    return 76;
  }
  if (len === 2) {
    return 48;
  }
  if (len <= 4) {
    return 30;
  }
  return 20;
};
