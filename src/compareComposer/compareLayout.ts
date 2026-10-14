import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const CMP_PAD = 48;
export const CMP_TITLE_H = 92;
export const CMP_TITLE_SIZE = 42;
export const CMP_BA = 64;
export const CMP_PHOTO_W = 390;
export const CMP_PHOTO_TOP = 210;
export const CMP_PHOTO_H = 980;
export const CMP_STATS_X = 438;
export const CMP_STATS_W = 324;
export const CMP_SUB_H = 88;
export const CMP_SUB_SIZE = 26;
export const CMP_STAT_SIZE = 40;
export const CMP_LABEL_SIZE = 14;
export const CMP_NAME_SIZE = 18;
export const CMP_LEAD = "#ffe566";
export const CMP_STAT_COUNT = 5;
export const CMP_STAT_MAX = 10;

/** Extra rows keep the photo columns and shrink type in the stats gutter. */
export const compareStatType = (count = CMP_STAT_COUNT) => {
  const n = Math.min(CMP_STAT_MAX, Math.max(1, count));
  if (n <= 5) {
    return { value: CMP_STAT_SIZE, label: CMP_LABEL_SIZE, rule: 52, stroke: 2.4 };
  }
  if (n === 6) {
    return { value: 36, label: 13, rule: 46, stroke: 2.2 };
  }
  if (n === 7) {
    return { value: 34, label: 12, rule: 42, stroke: 2 };
  }
  if (n === 8) {
    return { value: 32, label: 12, rule: 38, stroke: 1.8 };
  }
  if (n === 9) {
    return { value: 30, label: 11, rule: 36, stroke: 1.7 };
  }
  return { value: 28, label: 11, rule: 34, stroke: 1.6 };
};
