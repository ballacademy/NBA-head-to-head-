import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const SCC_SLOT_COUNT = 4;
/** Hero (slot 0) is full-bleed left; three standouts stack on the right. */
export const SCC_HERO_W = 732;
export const SCC_STACK_W = GRAPHIC_WIDTH - SCC_HERO_W;
export const SCC_STACK_H = GRAPHIC_HEIGHT / 3;
export const SCC_FADE_H = 520;
export const SCC_SEAM_W = 28;
export const SCC_KICKER_SIZE = 32;
export const SCC_KICKER_TRACK = 0.34;
export const SCC_TITLE_SIZE = 92;
export const SCC_TITLE_TRACK = 0.04;
export const SCC_PILL_H = 44;
export const SCC_PILL_PAD_X = 28;
export const SCC_DATE_SIZE = 16;
export const SCC_DATE_TRACK = 0.28;
export const SCC_BRAND_SIZE = 14;
export const SCC_BRAND_TRACK = 0.32;
export const SCC_BA_SIZE = 56;
export const SCC_BA_INSET = 24;
export const SCC_NAME_H = 156;
export const SCC_NAME_H_HERO = 188;
export const SCC_NAME_LOGO = 40;
export const SCC_NAME_LOGO_HERO = 52;
export const SCC_FAMILY_SIZE = 24;
export const SCC_FAMILY_SIZE_HERO = 36;
export const SCC_GIVEN_SIZE = 12;
export const SCC_GIVEN_SIZE_HERO = 15;
export const SCC_MARK = 140;
export const SCC_SWIPE_SIZE = 58;
export const SCC_SWIPE_INSET = 28;
export const SCC_LOCKUP_TOP = 52;

export const coverCellRect = (index: number) => {
  if (index <= 0) {
    return { x: 0, y: 0, w: SCC_HERO_W, h: GRAPHIC_HEIGHT };
  }
  const row = Math.min(index, SCC_SLOT_COUNT - 1) - 1;
  return {
    x: SCC_HERO_W,
    y: row * SCC_STACK_H,
    w: SCC_STACK_W,
    h: SCC_STACK_H,
  };
};

export const coverNameMetrics = (index: number) =>
  index === 0
    ? {
        nameH: SCC_NAME_H_HERO,
        logo: SCC_NAME_LOGO_HERO,
        family: SCC_FAMILY_SIZE_HERO,
        given: SCC_GIVEN_SIZE_HERO,
      }
    : {
        nameH: SCC_NAME_H,
        logo: SCC_NAME_LOGO,
        family: SCC_FAMILY_SIZE,
        given: SCC_GIVEN_SIZE,
      };
