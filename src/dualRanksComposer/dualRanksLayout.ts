import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import type { DualRanksLayout } from "./dualRanksState";

export const DR_SIDE_PHOTO = 0.45;
export const DR_TOP_PHOTO = 0.46;
export const DR_WELL_PHOTO = 0.58;
export const DR_PAD = 24;
export const DR_HEAD = 26;
export const DR_COL_GAP = 16;

export interface DualRanksRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DualRanksBoardLayout {
  photo: DualRanksRect;
  pane: DualRanksRect;
  rows: DualRanksRect;
  colW: number;
  colGap: number;
  rowH: number;
  restack: boolean;
}

export const dualRanksBoardHeight = (story = false) =>
  story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;

export const dualRanksPhotoRatio = (kind: DualRanksLayout) => {
  if (kind === "well") {
    return DR_WELL_PHOTO;
  }
  if (kind === "top") {
    return DR_TOP_PHOTO;
  }
  return DR_SIDE_PHOTO;
};

/** Side-by-side 45% photo, or stacked photo then packed columns. */
export const dualRanksLayout = (
  rowCount: number,
  kind: DualRanksLayout = "side",
  colCount = 2,
  boardH = GRAPHIC_HEIGHT,
): DualRanksBoardLayout => {
  const restack = kind !== "side";
  const n = Math.max(0, rowCount);
  const cols = Math.max(1, colCount);
  const photoW = restack
    ? GRAPHIC_WIDTH
    : Math.round(GRAPHIC_WIDTH * DR_SIDE_PHOTO);
  const photoH = restack
    ? Math.round(boardH * (kind === "well" ? DR_WELL_PHOTO : DR_TOP_PHOTO))
    : boardH;
  const pane: DualRanksRect = restack
    ? {
        x: 0,
        y: photoH,
        w: GRAPHIC_WIDTH,
        h: Math.max(0, boardH - photoH),
      }
    : {
        x: photoW,
        y: 0,
        w: GRAPHIC_WIDTH - photoW,
        h: boardH,
      };
  const innerX = pane.x + DR_PAD;
  const innerY = pane.y + DR_PAD;
  const innerW = Math.max(0, pane.w - DR_PAD * 2);
  const innerH = Math.max(0, pane.h - DR_PAD * 2);
  const rowsH = Math.max(0, innerH - DR_HEAD);
  const colGap = cols > 1 ? DR_COL_GAP : 0;
  const colW = cols > 0 ? (innerW - colGap * (cols - 1)) / cols : innerW;
  return {
    photo: { x: 0, y: 0, w: photoW, h: photoH },
    pane,
    rows: { x: innerX, y: innerY + DR_HEAD, w: innerW, h: rowsH },
    colW,
    colGap,
    rowH: n > 0 ? rowsH / n : 0,
    restack,
  };
};
