import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";

export {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
};

export const CMP_PAD = 48;
export const CMP_INSET = 36;
export const CMP_TITLE_TOP = 36;
export const CMP_TITLE_H = 92;
export const CMP_TITLE_SIZE = 42;
export const CMP_STACK_GAP = 12;
export const CMP_BA = 64;
export const CMP_PHOTO_W = 390;
export const CMP_COL_GAP = 8;
export const CMP_STATS_W = 324;
export const CMP_SUB_H = 88;
export const CMP_SUB_SIZE = 26;
export const CMP_STAT_SIZE = 40;
export const CMP_LABEL_SIZE = 14;
export const CMP_NAME_SIZE = 18;
export const CMP_LEAD = "#ffe566";
export const CMP_STAT_COUNT = 5;
export const CMP_STAT_MAX = 10;

export const compareBoardHeight = (story = false) =>
  story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;

export const compareStackTop = () => CMP_TITLE_TOP + CMP_TITLE_H + CMP_STACK_GAP;

export const compareStackBottom = (story = false, hasSub = false) => {
  const reserve = hasSub
    ? CMP_INSET + CMP_SUB_H + CMP_STACK_GAP
    : CMP_INSET;
  return compareBoardHeight(story) - reserve;
};

/** Photo columns + center stats fill leftover height under the title. */
export const comparePhotoFrame = (story = false, hasSub = false) => {
  const y = compareStackTop();
  const bottom = compareStackBottom(story, hasSub);
  const inner = GRAPHIC_WIDTH - CMP_INSET * 2;
  const photoW = (inner - CMP_STATS_W - CMP_COL_GAP * 2) / 2;
  return {
    y,
    h: bottom - y,
    w: photoW,
    leftX: CMP_INSET,
    statsX: CMP_INSET + photoW + CMP_COL_GAP,
    statsW: CMP_STATS_W,
    rightX: GRAPHIC_WIDTH - CMP_INSET - photoW,
  };
};

/** @deprecated Use comparePhotoFrame().h — columns stretch with the board. */
export const CMP_PHOTO_TOP = compareStackTop();
export const CMP_PHOTO_H = comparePhotoFrame(false, false).h;
export const CMP_STATS_X = comparePhotoFrame(false, false).statsX;

/** Extra rows keep the photo columns; type shrinks in the stats gutter. */
export const compareStatType = (count = CMP_STAT_COUNT) => {
  const n = Math.min(CMP_STAT_MAX, Math.max(1, count));
  if (n <= 5) {
    return { value: CMP_STAT_SIZE, label: CMP_LABEL_SIZE, rule: 0.56, stroke: 2.4 };
  }
  if (n === 6) {
    return { value: 36, label: 13, rule: 0.54, stroke: 2.2 };
  }
  if (n === 7) {
    return { value: 34, label: 12, rule: 0.52, stroke: 2 };
  }
  if (n === 8) {
    return { value: 32, label: 12, rule: 0.5, stroke: 1.8 };
  }
  if (n === 9) {
    return { value: 30, label: 11, rule: 0.48, stroke: 1.7 };
  }
  return { value: 28, label: 11, rule: 0.46, stroke: 1.6 };
};
