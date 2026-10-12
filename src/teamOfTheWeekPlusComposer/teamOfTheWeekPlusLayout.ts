import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import {
  PLUS_SLOT_COUNT,
  PLUS_STANDOUT_COUNT,
  PLUS_STARTER_COUNT,
} from "./teamOfTheWeekPlusState";

export {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PLUS_SLOT_COUNT,
  PLUS_STANDOUT_COUNT,
  PLUS_STARTER_COUNT,
};

/** Compact chrome — letters or BA mark, no title plate. */
export const PLUS_CHROME_H = 70;
export const PLUS_BRAND_SIZE = 22;
export const PLUS_WEEK_SIZE = 13;
export const PLUS_CAPTION_H = 26;
export const PLUS_CAPTION_SIZE = 16;
export const PLUS_STANDOUT_CAPTION_SIZE = 14;
export const PLUS_ROW_GAP = 22;
export const PLUS_FOOTER = 22;
export const PLUS_STARTER_PAD_X = 28;
export const PLUS_STANDOUT_PAD_X = 64;
export const PLUS_STARTER_SHARE = 0.55;
export const PLUS_STARTER_NAME_H = 38;
export const PLUS_STANDOUT_NAME_H = 32;
export const PLUS_NAME_SIZE = 16;
export const PLUS_STANDOUT_NAME_SIZE = 14;

const photoStackH = () =>
  GRAPHIC_HEIGHT -
  PLUS_CHROME_H -
  PLUS_FOOTER -
  PLUS_CAPTION_H * 2 -
  PLUS_ROW_GAP;

export interface PlusBoardMetrics {
  chromeH: number;
  footer: number;
  captionH: number;
  rowGap: number;
  photoStackH: number;
  starterH: number;
  standoutH: number;
  starterY: number;
  standoutY: number;
  starterW: number;
  standoutW: number;
  starterCaptionY: number;
  standoutCaptionY: number;
}

export const plusBoardMetrics = (): PlusBoardMetrics => {
  const stack = photoStackH();
  const starterH = Math.round(stack * PLUS_STARTER_SHARE);
  const standoutH = stack - starterH;
  const starterCaptionY = PLUS_CHROME_H;
  const starterY = starterCaptionY + PLUS_CAPTION_H;
  const standoutCaptionY = starterY + starterH + PLUS_ROW_GAP;
  const standoutY = standoutCaptionY + PLUS_CAPTION_H;
  return {
    chromeH: PLUS_CHROME_H,
    footer: PLUS_FOOTER,
    captionH: PLUS_CAPTION_H,
    rowGap: PLUS_ROW_GAP,
    photoStackH: stack,
    starterH,
    standoutH,
    starterY,
    standoutY,
    starterW: (GRAPHIC_WIDTH - PLUS_STARTER_PAD_X * 2) / PLUS_STARTER_COUNT,
    standoutW: (GRAPHIC_WIDTH - PLUS_STANDOUT_PAD_X * 2) / PLUS_STANDOUT_COUNT,
    starterCaptionY,
    standoutCaptionY,
  };
};

export const plusCellRect = (
  row: "starters" | "standouts",
  index: number,
) => {
  const metrics = plusBoardMetrics();
  if (row === "starters") {
    return {
      x: PLUS_STARTER_PAD_X + index * metrics.starterW,
      y: metrics.starterY,
      w: metrics.starterW,
      h: metrics.starterH,
      nameH: PLUS_STARTER_NAME_H,
    };
  }
  return {
    x: PLUS_STANDOUT_PAD_X + index * metrics.standoutW,
    y: metrics.standoutY,
    w: metrics.standoutW,
    h: metrics.standoutH,
    nameH: PLUS_STANDOUT_NAME_H,
  };
};

export const plusBarRect = (row: "starters" | "standouts") => {
  const count = row === "starters" ? PLUS_STARTER_COUNT : PLUS_STANDOUT_COUNT;
  const first = plusCellRect(row, 0);
  const last = plusCellRect(row, count - 1);
  return {
    x: first.x,
    y: first.y,
    w: last.x + last.w - first.x,
    h: first.h,
  };
};
