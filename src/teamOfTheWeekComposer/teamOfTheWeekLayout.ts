import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { TOTW_STRIP_COUNT } from "./teamOfTheWeekState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH, TOTW_STRIP_COUNT };

export const TOTW_PAD_X = 22;
export const TOTW_STRIP_GAP = 8;
export const TOTW_BRAND_H = 58;
export const TOTW_BRAND_SIZE = 28;
export const TOTW_TITLE_PLATE_H = 116;
export const TOTW_TITLE_SIZE = 42;
export const TOTW_TITLE_PAD = 12;
export const TOTW_PLATE_X = 48;
export const TOTW_WEEK_H = 36;
export const TOTW_WEEK_SIZE = 20;
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
