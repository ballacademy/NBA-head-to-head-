import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { TOTW_STRIP_COUNT } from "./teamOfTheWeekState";

export {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
  TOTW_STRIP_COUNT,
};

export const TOTW_PAD_X = 10;
export const TOTW_STRIP_GAP = 6;
export const TOTW_BRAND_H = 40;
export const TOTW_BRAND_SIZE = 26;
export const TOTW_TITLE_PLATE_H = 116;
export const TOTW_TITLE_SIZE = 42;
export const TOTW_TITLE_PAD = 12;
export const TOTW_PLATE_X = 48;
export const TOTW_WEEK_H = 36;
export const TOTW_WEEK_SIZE = 20;
export const TOTW_NAME_H = 78;
export const TOTW_NAME_LOGO = 20;
export const TOTW_NAME_SIZE = 16;
export const TOTW_NAME_GIVEN_SIZE = 12;
export const TOTW_FOOTER_H = 160;
export const TOTW_FOOTER_PAD = 10;
export const TOTW_STRIPS_TOP = TOTW_BRAND_H;
export const TOTW_STRIPS_BOTTOM = GRAPHIC_HEIGHT - TOTW_FOOTER_H;

export const TOTW_STRIP_W =
  (GRAPHIC_WIDTH - TOTW_PAD_X * 2 - TOTW_STRIP_GAP * (TOTW_STRIP_COUNT - 1)) /
  TOTW_STRIP_COUNT;

export const TOTW_STRIP_H = TOTW_STRIPS_BOTTOM - TOTW_STRIPS_TOP;

export const totwStripX = (index: number) =>
  TOTW_PAD_X + index * (TOTW_STRIP_W + TOTW_STRIP_GAP);

export const totwBoardH = (story = false) =>
  story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;

export const totwStripRect = (index: number, story = false) => {
  if (!story) {
    return {
      x: totwStripX(index),
      y: TOTW_STRIPS_TOP,
      w: TOTW_STRIP_W,
      h: TOTW_STRIP_H,
    };
  }
  const stripsBottom = STORY_DESIGN_HEIGHT - TOTW_FOOTER_H;
  const stripsH = stripsBottom - TOTW_STRIPS_TOP;
  const h =
    (stripsH - TOTW_STRIP_GAP * (TOTW_STRIP_COUNT - 1)) / TOTW_STRIP_COUNT;
  return {
    x: TOTW_PAD_X,
    y: TOTW_STRIPS_TOP + index * (h + TOTW_STRIP_GAP),
    w: GRAPHIC_WIDTH - TOTW_PAD_X * 2,
    h,
  };
};
