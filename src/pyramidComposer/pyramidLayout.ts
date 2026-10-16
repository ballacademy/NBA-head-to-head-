import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const PYR_MIN_ROWS = 4;
export const PYR_MAX_ROWS = 6;
export const PYR_DEFAULT_ROWS = 4;
export const PYR_PAD_X = 28;
export const PYR_COL_GAP = 12;
export const PYR_PAD_BOTTOM = 36;
export const PYR_QUIET_FRAME = 2;
export const PYR_TITLE_Y = 22;
export const PYR_TITLE_H = 96;
export const PYR_TITLE_SIZE = 54;
export const PYR_TITLE_TRACK = 0.04;
export const PYR_BA_SIZE = 72;
export const PYR_BA_INSET = 36;
export const PYR_POP_RATIO = 0.34;
export const PYR_POP_GUTTER = 14;
/** Kyber cell fill — electric violet blade, not magenta studs. */
export const PYR_CELL_FILL = "#6a00e6";
/** Specular glints on the kyber plate — pale electric, not flat magenta. */
export const PYR_CELL_STUD = "#f0d6ff";
/** Tight silhouette rim on the popped-out head, design px. */
export const PYR_POP_RIM = 2.2;
/** Soft kyber glow around that rim, design px. */
export const PYR_POP_RIM_GLOW = 5.5;
/** Alpha above this counts as the head when gapping the top stroke. */
export const PYR_CUTOUT_ALPHA = 28;
/** Expand the gap so wispy hair still breaks the line. Design px. */
export const PYR_CUTOUT_DILATE = 7;
/** How far into the cell to union opaque columns (face, not shoulders). */
export const PYR_CUTOUT_BAND = 20;

/** First/last opaque columns in a 1D alpha row. `right` is exclusive. */
export const opaqueSpanFromAlphas = (
  columns: ArrayLike<number>,
  threshold = PYR_CUTOUT_ALPHA,
  dilate = 0,
): { left: number; right: number } | null => {
  let first = -1;
  let last = -1;
  for (let index = 0; index < columns.length; index += 1) {
    if (columns[index]! > threshold) {
      if (first < 0) {
        first = index;
      }
      last = index;
    }
  }
  if (first < 0) {
    return null;
  }
  return {
    left: Math.max(0, first - dilate),
    right: Math.min(columns.length, last + 1 + dilate),
  };
};

/** @deprecated Use pyramidSlotCount(rowCount). 4-row default. */
export const PYRAMID_ROWS = [1, 2, 3, 4] as const;
/** @deprecated Use pyramidSlotCount(rowCount). */
export const PYRAMID_SLOT_COUNT = 10;

export const clampPyramidRows = (value: number) =>
  Math.min(PYR_MAX_ROWS, Math.max(PYR_MIN_ROWS, Math.round(value)));

export const pyramidRowsFor = (rowCount: number) => {
  const n = clampPyramidRows(rowCount);
  return Array.from({ length: n }, (_, index) => index + 1);
};

export const pyramidSlotCount = (rowCount: number) => {
  const n = clampPyramidRows(rowCount);
  return (n * (n + 1)) / 2;
};

export interface PyramidMetrics {
  rows: number[];
  rowCount: number;
  slotCount: number;
  cell: number;
  pop: number;
  rowGap: number;
  colGap: number;
  originY: number;
}

const stackFits = (rowCount: number, cell: number, boardH = GRAPHIC_HEIGHT) => {
  const pop = cell * PYR_POP_RATIO;
  const rowGap = PYR_COL_GAP;
  const stackH = rowCount * cell + (rowCount - 1) * rowGap;
  const originY = boardH - PYR_PAD_BOTTOM - stackH;
  const titleBottom = PYR_TITLE_Y + PYR_TITLE_H;
  return originY - pop >= titleBottom + 6 && originY > 0;
};

export const pyramidMetrics = (
  rowCount = PYR_DEFAULT_ROWS,
  boardH = GRAPHIC_HEIGHT,
): PyramidMetrics => {
  const rows = pyramidRowsFor(rowCount);
  const n = rows.length;
  const widthCell =
    (GRAPHIC_WIDTH - PYR_PAD_X * 2 - PYR_COL_GAP * (n - 1)) / n;
  let cell = widthCell;
  if (!stackFits(n, cell, boardH)) {
    let lo = 72;
    let hi = cell;
    for (let step = 0; step < 24; step += 1) {
      const mid = (lo + hi) / 2;
      if (stackFits(n, mid, boardH)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    cell = lo;
  }
  const pop = cell * PYR_POP_RATIO;
  const rowGap = PYR_COL_GAP;
  const stackH = n * cell + (n - 1) * rowGap;
  const originY = boardH - PYR_PAD_BOTTOM - stackH;
  return {
    rows,
    rowCount: n,
    slotCount: pyramidSlotCount(n),
    cell,
    pop,
    rowGap,
    colGap: PYR_COL_GAP,
    originY,
  };
};

export const pyramidRowOf = (index: number, rowCount = PYR_DEFAULT_ROWS) => {
  const rows = pyramidRowsFor(rowCount);
  let cursor = 0;
  for (let row = 0; row < rows.length; row += 1) {
    const count = rows[row]!;
    if (index < cursor + count) {
      return { row, col: index - cursor, count };
    }
    cursor += count;
  }
  const last = rows.length - 1;
  return { row: last, col: 0, count: rows[last]! };
};

export const pyramidCellRect = (
  index: number,
  rowCount = PYR_DEFAULT_ROWS,
  boardH = GRAPHIC_HEIGHT,
) => {
  const metrics = pyramidMetrics(rowCount, boardH);
  const { row, col, count } = pyramidRowOf(index, rowCount);
  const totalW = count * metrics.cell + (count - 1) * metrics.colGap;
  const x = (GRAPHIC_WIDTH - totalW) / 2 + col * (metrics.cell + metrics.colGap);
  const y = metrics.originY + row * (metrics.cell + metrics.rowGap);
  return {
    x,
    y,
    w: metrics.cell,
    h: metrics.cell,
    pop: metrics.pop,
    row,
    col,
  };
};

/** Largest cell used by the 4-row board — kept for tests that size the default. */
export const PYR_CELL = pyramidMetrics(PYR_DEFAULT_ROWS).cell;
export const PYR_GAP = pyramidMetrics(PYR_DEFAULT_ROWS).rowGap;
export const PYR_ROWS_Y = pyramidMetrics(PYR_DEFAULT_ROWS).originY;
