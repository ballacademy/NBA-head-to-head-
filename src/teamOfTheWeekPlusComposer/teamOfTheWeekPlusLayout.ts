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

/** Headline + week notch. Portraits stay the hero; BA is a corner mark. */
export const PLUS_HEADER_H = 122;
export const PLUS_TITLE_SIZE = 50;
export const PLUS_TITLE_TRACK = 0.02;
export const PLUS_WEEK_H = 36;
export const PLUS_WEEK_SIZE = 20;
export const PLUS_SECTION_H = 54;
export const PLUS_SECTION_SIZE = 34;
export const PLUS_SECTION_TRACK = 0.04;
export const PLUS_FOOTER = 16;
export const PLUS_STARTER_PAD_X = 28;
export const PLUS_STANDOUT_PAD_X = 56;
export const PLUS_STARTER_SHARE = 0.55;
export const PLUS_STARTER_NAME_H = 38;
export const PLUS_STANDOUT_NAME_H = 32;
export const PLUS_NAME_SIZE = 16;
export const PLUS_STANDOUT_NAME_SIZE = 14;
export const PLUS_BRAND_SIZE = 13;
/** Circled BA lockup — same size as the tier-list corner mark. */
export const PLUS_BA_SIZE = 72;
export const PLUS_BA_INSET = (PLUS_HEADER_H - PLUS_BA_SIZE) / 2;
export const PLUS_HEADER_PAD_X = PLUS_BA_INSET + PLUS_BA_SIZE + 8;
export const PLUS_ZOOM_STEP = 0.5;

const photoStackH = () =>
  GRAPHIC_HEIGHT - PLUS_HEADER_H - PLUS_SECTION_H - PLUS_FOOTER;

export interface PlusBoardMetrics {
  headerH: number;
  sectionH: number;
  footer: number;
  photoStackH: number;
  starterH: number;
  standoutH: number;
  starterY: number;
  standoutY: number;
  starterW: number;
  standoutW: number;
  titleY: number;
  weekY: number;
  weekH: number;
  sectionY: number;
}

export const plusBoardMetrics = (): PlusBoardMetrics => {
  const stack = photoStackH();
  const starterH = Math.round(stack * PLUS_STARTER_SHARE);
  const standoutH = stack - starterH;
  const starterY = PLUS_HEADER_H;
  const sectionY = starterY + starterH;
  const standoutY = sectionY + PLUS_SECTION_H;
  return {
    headerH: PLUS_HEADER_H,
    sectionH: PLUS_SECTION_H,
    footer: PLUS_FOOTER,
    photoStackH: stack,
    starterH,
    standoutH,
    starterY,
    standoutY,
    starterW: (GRAPHIC_WIDTH - PLUS_STARTER_PAD_X * 2) / PLUS_STARTER_COUNT,
    standoutW: (GRAPHIC_WIDTH - PLUS_STANDOUT_PAD_X * 2) / PLUS_STANDOUT_COUNT,
    titleY: 58,
    weekY: 82,
    weekH: PLUS_WEEK_H,
    sectionY,
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
