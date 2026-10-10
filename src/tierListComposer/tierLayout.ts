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
export const TIER_ROW_PAD_Y = 12;
export const TIER_BADGE_SIZE = 64;
export const TIER_TITLE_SIZE = 54;
export const TIER_TITLE_TRACK = 0.04;

export const cellsContentWidth = () =>
  GRAPHIC_WIDTH - TIER_LABEL_W - TIER_CELLS_INSET - TIER_PAD_RIGHT;

export const rowMetrics = (rowCount: number) => {
  const count = Math.max(1, rowCount);
  const bodyH = GRAPHIC_HEIGHT - TIER_HEADER_H - TIER_FOOTER;
  const rowH = bodyH / count;
  return { bodyH, rowH };
};

export const cellSize = (
  rowH: number,
  contentW: number,
  slotCount: number,
) => {
  const n = Math.max(1, slotCount);
  const innerH = Math.max(28, rowH - TIER_ROW_PAD_Y * 2);
  const availableW = contentW - TIER_CELL_GAP * (n - 1);
  return Math.max(28, Math.min(TIER_CELL_MAX, innerH, availableW / n));
};

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
