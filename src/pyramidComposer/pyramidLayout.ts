import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const PYRAMID_ROWS = [1, 2, 3, 4] as const;
export const PYRAMID_SLOT_COUNT = PYRAMID_ROWS.reduce(
  (sum, count) => sum + count,
  0,
);

export const PYR_PAD_X = 36;
export const PYR_GAP = 16;
export const PYR_CELL =
  (GRAPHIC_WIDTH - PYR_PAD_X * 2 - PYR_GAP * (PYRAMID_ROWS[3] - 1)) /
  PYRAMID_ROWS[3];
export const PYR_TITLE_Y = 28;
export const PYR_TITLE_H = 92;
export const PYR_TITLE_SIZE = 54;
export const PYR_TITLE_TRACK = 0.04;
export const PYR_ROWS_Y = 132;
export const PYR_BA_SIZE = 72;
export const PYR_BA_INSET = 36;

export const pyramidRowOf = (index: number) => {
  let cursor = 0;
  for (let row = 0; row < PYRAMID_ROWS.length; row += 1) {
    const count = PYRAMID_ROWS[row]!;
    if (index < cursor + count) {
      return { row, col: index - cursor, count };
    }
    cursor += count;
  }
  return { row: PYRAMID_ROWS.length - 1, col: 0, count: PYRAMID_ROWS[3] };
};

export const pyramidCellRect = (index: number) => {
  const { row, col, count } = pyramidRowOf(index);
  const totalW = count * PYR_CELL + (count - 1) * PYR_GAP;
  const x = (GRAPHIC_WIDTH - totalW) / 2 + col * (PYR_CELL + PYR_GAP);
  const y = PYR_ROWS_Y + row * (PYR_CELL + PYR_GAP);
  return { x, y, w: PYR_CELL, h: PYR_CELL, row, col };
};
