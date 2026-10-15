import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const SCC_SLOT_COUNT = 4;
export const SCC_MAST_H = 236;
export const SCC_GUTTER = 4;
export const SCC_TITLE_SIZE = 96;
export const SCC_TITLE_TRACK = 0.06;
export const SCC_DATE_SIZE = 22;
export const SCC_DATE_TRACK = 0.22;
export const SCC_BRAND_SIZE = 16;
export const SCC_BRAND_TRACK = 0.28;
export const SCC_BA_SIZE = 64;
export const SCC_BA_INSET = 28;
export const SCC_NAME_H = 168;
export const SCC_NAME_LOGO = 44;
export const SCC_FAMILY_SIZE = 30;
export const SCC_GIVEN_SIZE = 13;
export const SCC_MARK = 160;

export const coverCellRect = (index: number) => {
  const col = index % 2;
  const row = Math.floor(index / 2);
  const cellW = (GRAPHIC_WIDTH - SCC_GUTTER) / 2;
  const cellH = (GRAPHIC_HEIGHT - SCC_MAST_H - SCC_GUTTER) / 2;
  return {
    x: col * (cellW + SCC_GUTTER),
    y: SCC_MAST_H + row * (cellH + SCC_GUTTER),
    w: cellW,
    h: cellH,
  };
};
