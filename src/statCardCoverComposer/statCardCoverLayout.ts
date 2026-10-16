import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

/** Three even full-bleed columns — one row, no hero stack. */
export const SCC_SLOT_COUNT = 3;
export const SCC_COL_W = GRAPHIC_WIDTH / SCC_SLOT_COUNT;
export const SCC_FADE_H = 460;
/** Drop default portraits so faces sit under the title fade, not inside it. */
export const SCC_PHOTO_SHIFT = 0.28;
export const SCC_SEAM_W = 20;
export const SCC_TITLE_SIZE = 72;
export const SCC_TITLE_TRACK = 0.02;
/** Extra tracking on the lead line so STARS AND matches STANDOUTS width. */
export const SCC_TITLE_LEAD_TRACK = 0.072;
export const SCC_TITLE_MAX_EM = 14.2;
export const SCC_PILL_H = 44;
export const SCC_PILL_PAD_X = 28;
export const SCC_DATE_SIZE = 16;
export const SCC_DATE_TRACK = 0.28;
export const SCC_BA_SIZE = 56;
export const SCC_BA_INSET = 24;
export const SCC_NAME_H = 168;
export const SCC_NAME_LOGO = 44;
export const SCC_FAMILY_SIZE = 28;
export const SCC_GIVEN_SIZE = 13;
export const SCC_MARK = 140;
export const SCC_SWIPE_SIZE = 58;
export const SCC_SWIPE_INSET = 28;
export const SCC_LOCKUP_TOP = 56;
/** Tasteful gold accents — lockup, seams, date pill, swipe. Not a flood. */
export const SCC_GOLD_PALE = "#fde68a";
export const SCC_GOLD = "#facc15";
export const SCC_GOLD_DEEP = "#d4af37";
export const SCC_GOLD_HAIR = 2;

export const coverCellRect = (index: number) => {
  const col = Math.max(0, Math.min(index, SCC_SLOT_COUNT - 1));
  return {
    x: col * SCC_COL_W,
    y: 0,
    w: SCC_COL_W,
    h: GRAPHIC_HEIGHT,
  };
};

export const coverNameMetrics = (_index?: number) => ({
  nameH: SCC_NAME_H,
  logo: SCC_NAME_LOGO,
  family: SCC_FAMILY_SIZE,
  given: SCC_GIVEN_SIZE,
});

export const coverSeamXs = () =>
  Array.from({ length: SCC_SLOT_COUNT - 1 }, (_, index) => (index + 1) * SCC_COL_W);
