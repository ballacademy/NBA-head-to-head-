import { measureTitleAdvance } from "../instagramComposer/titleLayout";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

/** Board-space (1200×1500) layout shared by the on-screen graphic and PNG. */
/**
 * Title/BA strip stays compact. Grow only if a two-line title at
 * `TIER_TITLE_SIZE` would clip — do not return to a large header.
 */
export const TIER_HEADER_H = 140;
export const TIER_FOOTER = 2;
export const TIER_LABEL_W = 140;
/** Color column may grow a bit so a word like MINUTES stays one line. */
export const TIER_LABEL_W_MAX = 210;
export const TIER_LABEL_PAD_X = 8;
export const TIER_LABEL_INNER_W = TIER_LABEL_W - TIER_LABEL_PAD_X * 2;
export const TIER_LABEL_INNER_W_MAX = TIER_LABEL_W_MAX - TIER_LABEL_PAD_X * 2;
/** Extra room so Montserrat Black does not clip the last letter (CANDIDATE). */
export const TIER_LABEL_FIT_SLACK = 6;
/**
 * Live Montserrat Black is wider than `measureTitleAdvance` (CANDIDATE at
 * 28px is ~185px, not ~162). Scale so wrap/shrink match the painted glyphs.
 */
const TIER_LABEL_ADVANCE_SCALE = 1.14;
export const TIER_LABEL_TRACK = 0.02;
/** Long names wrap in the label column; this is not an 8-character typing cap. */
export const TIER_LABEL_MAX_LENGTH = 48;
export const TIER_LABEL_MAX_LINES = 4;
export const TIER_LABEL_SIZE_ONE = 72;
export const TIER_LABEL_SIZE_TWO = 48;
export const TIER_LABEL_SIZE_LONG = 28;
export const TIER_LABEL_SIZE_MIN = 16;
export const TIER_CELLS_INSET = 4;
export const TIER_PAD_RIGHT = 4;
/**
 * Hairline between cell outer edges. 4px White/Black strokes live in each
 * cell’s outer band (outside the photo); a 0-gap flush would fuse those
 * strokes, so keep a 2px gutter — still tighter than a full frame width.
 */
export const TIER_CELL_GAP = 2;
/** Cap for sparse boards; packed 8-across is still limited by content width. */
export const TIER_CELL_MAX = 440;
/** Logos stay this wide; extra items wrap onto another lane in the same tier. */
export const TIER_WRAP_COLS = 8;
export const TIER_ROW_PAD_Y = 0;
/** Circled BA lockup (white ring + letters). Letters-only mark is `/ba-logo.png`. */
export const BA_LOGO_SRC = "/ba-logo-circled.png";
export const TIER_BADGE_SIZE = 72;
/**
 * Equal inset from the graphic’s top edge and right edge so the lockup is
 * not hugging the right. Matches the header’s vertical centering gap.
 */
export const TIER_BADGE_INSET = (TIER_HEADER_H - TIER_BADGE_SIZE) / 2;
export const TIER_TITLE_SIZE = 50;
/** Faded team-logo backdrop behind a player headshot. Fitted to the cell. */
export const PLAYER_LOGO_WATERMARK_ALPHA = 0.22;
export const TIER_TITLE_TRACK = 0.04;

export const cellsContentWidth = (labelW = TIER_LABEL_W) =>
  GRAPHIC_WIDTH - labelW - TIER_CELLS_INSET - TIER_PAD_RIGHT;

export const rowMetrics = (rowCount: number, boardH = GRAPHIC_HEIGHT) => {
  const count = Math.max(1, rowCount);
  const bodyH = boardH - TIER_HEADER_H - TIER_FOOTER;
  const rowH = bodyH / count;
  return { bodyH, rowH };
};

/** How many vertical lanes a tier needs so items wrap at 8 per row. */
export const tierLaneCount = (itemCount: number) =>
  Math.max(1, Math.ceil(Math.max(0, itemCount) / TIER_WRAP_COLS));

export interface TierCellMetrics {
  width: number;
  height: number;
}

/**
 * Packed 8-across is width-capped, so height fills the lane (portrait) to
 * kill empty space above/below the row. Sparse rows stay square.
 */
export const cellMetrics = (
  laneH: number,
  contentW: number,
  slotCount = TIER_WRAP_COLS,
): TierCellMetrics => {
  const cols = Math.min(TIER_WRAP_COLS, Math.max(1, slotCount));
  const innerH = Math.max(28, laneH - TIER_ROW_PAD_Y * 2);
  const availableW = contentW - TIER_CELL_GAP * (cols - 1);
  // Leave one hairline so wrapped lanes (cellH + gap + cellH) still fit.
  const height = Math.max(
    28,
    Math.min(TIER_CELL_MAX, innerH - TIER_CELL_GAP),
  );
  const width = Math.max(
    28,
    Math.min(TIER_CELL_MAX, height, availableW / cols),
  );
  return { width, height };
};

export const cellSize = (
  laneH: number,
  contentW: number,
  slotCount = TIER_WRAP_COLS,
) => cellMetrics(laneH, contentW, slotCount).width;

export interface TierBoardLayout {
  lanes: number[];
  totalLanes: number;
  bodyH: number;
  laneH: number;
  size: number;
  cellW: number;
  cellH: number;
  contentW: number;
  labelW: number;
  cols: number;
  gridTemplate: string;
}

/** How many squares a lane actually has to hold (1–8), for sizing. */
export const laneSlotCount = (itemCount: number) =>
  Math.min(TIER_WRAP_COLS, Math.max(1, itemCount));

/** Collapsed empty-tier weight so filled rows eat leftover board. */
export const EMPTY_TIER_LANES = 0.32;

export const tierBoardLayout = (
  itemCounts: number[],
  boardH = GRAPHIC_HEIGHT,
  labelW = TIER_LABEL_W,
): TierBoardLayout => {
  const columnW = Math.min(
    TIER_LABEL_W_MAX,
    Math.max(TIER_LABEL_W, labelW),
  );
  const anyFilled = itemCounts.some((count) => count > 0);
  const lanes = itemCounts.map((count) => {
    if (anyFilled && count === 0) {
      return EMPTY_TIER_LANES;
    }
    return Math.max(1, tierLaneCount(count));
  });
  const totalLanes = Math.max(1, lanes.reduce((sum, count) => sum + count, 0));
  const bodyH = boardH - TIER_HEADER_H - TIER_FOOTER;
  const contentW = cellsContentWidth(columnW);
  /** Stretch lanes so the last tier meets the footer, 3–10 rows alike. */
  const laneH = bodyH / totalLanes;
  const cols = itemCounts.length
    ? Math.max(1, ...itemCounts.map((count) => laneSlotCount(count)))
    : 1;
  const metrics = cellMetrics(laneH, contentW, cols);
  return {
    lanes,
    totalLanes,
    bodyH,
    laneH,
    size: metrics.width,
    cellW: metrics.width,
    cellH: metrics.height,
    contentW,
    labelW: columnW,
    cols,
    gridTemplate: lanes.map((count) => `minmax(0, ${count}fr)`).join(" "),
  };
};

export const cellGridPosition = (index: number) => ({
  col: index % TIER_WRAP_COLS,
  wrapRow: Math.floor(index / TIER_WRAP_COLS),
});

/** Compact add control when a full-size slot would wrap a new editor-only lane. */
export const ADD_CHIP_COMPACT = 48;

export type AddChipPlacement =
  | { kind: "slot"; col: number; wrapRow: number }
  | { kind: "compact"; empty: boolean; wrapRow: number };

/**
 * Editor + chip. Preview packing uses filled items only — same as the PNG —
 * so this chip overlays and never creates an extra wrap row.
 */
export const addChipPlacement = (
  itemCount: number,
  cols: number,
): AddChipPlacement => {
  const filled = Math.max(0, itemCount);
  if (filled === 0) {
    return { kind: "compact", empty: true, wrapRow: 0 };
  }
  const next = cellGridPosition(filled);
  const lastWrap = Math.floor((filled - 1) / TIER_WRAP_COLS);
  if (next.wrapRow === lastWrap && next.col < Math.max(1, cols)) {
    return { kind: "slot", col: next.col, wrapRow: next.wrapRow };
  }
  return { kind: "compact", empty: false, wrapRow: lastWrap };
};

export const baBadgeRect = () => ({
  x: GRAPHIC_WIDTH - TIER_BADGE_INSET - TIER_BADGE_SIZE,
  y: TIER_BADGE_INSET,
  size: TIER_BADGE_SIZE,
});

const labelWidthAt = (text: string, fontSize: number) =>
  measureTitleAdvance(text.toUpperCase(), TIER_LABEL_TRACK) *
  fontSize *
  TIER_LABEL_ADVANCE_SCALE;

const lineFits = (text: string, fontSize: number, innerW: number) =>
  labelWidthAt(text, fontSize) + TIER_LABEL_FIT_SLACK <= innerW + 0.01;

const longestWordWidth = (words: string[], fontSize: number) =>
  Math.max(0, ...words.map((word) => labelWidthAt(word, fontSize)));

/**
 * Wrap only at spaces. Never slice a word (MINUTES stays MINUTES, not
 * MINUTE / S). A word that still overflows is its own line — callers shrink
 * type or grow the color column first.
 */
export const wrapTierLabel = (
  label: string,
  fontSize: number,
  innerW = TIER_LABEL_INNER_W,
): string[] => {
  const text = label.replace(/\s+/g, " ").trim();
  if (!text) {
    return [" "];
  }
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || lineFits(next, fontSize, innerW)) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [" "];
};

const startingLabelSize = (label: string) => {
  const len = label.replace(/\s+/g, " ").trim().length;
  if (len <= 1) {
    return TIER_LABEL_SIZE_ONE;
  }
  if (len === 2) {
    return TIER_LABEL_SIZE_TWO;
  }
  return TIER_LABEL_SIZE_LONG;
};

export interface TierLabelLayout {
  lines: string[];
  fontSize: number;
  columnW: number;
}

export const layoutTierLabel = (label: string): TierLabelLayout => {
  const trimmed = label.replace(/\s+/g, " ").trim();
  const words = trimmed ? trimmed.split(" ") : [" "];
  let fontSize = startingLabelSize(trimmed);
  let innerW = TIER_LABEL_INNER_W;
  const needed = Math.ceil(
    longestWordWidth(words, fontSize) + TIER_LABEL_FIT_SLACK,
  );
  if (needed > innerW) {
    innerW = Math.min(TIER_LABEL_INNER_W_MAX, needed);
  }
  while (
    fontSize > TIER_LABEL_SIZE_MIN &&
    longestWordWidth(words, fontSize) + TIER_LABEL_FIT_SLACK > innerW + 0.01
  ) {
    fontSize -= 1;
  }
  while (fontSize > TIER_LABEL_SIZE_MIN) {
    const trial = wrapTierLabel(trimmed, fontSize, innerW);
    if (trial.length <= TIER_LABEL_MAX_LINES) {
      break;
    }
    fontSize -= 1;
  }
  const lines = wrapTierLabel(trimmed, fontSize, innerW);
  const usedInner = Math.max(
    0,
    ...lines.map((line) => labelWidthAt(line, fontSize)),
  );
  const columnW = Math.min(
    TIER_LABEL_W_MAX,
    Math.max(
      TIER_LABEL_W,
      Math.ceil(usedInner + TIER_LABEL_PAD_X * 2 + TIER_LABEL_FIT_SLACK),
    ),
  );
  return { lines, fontSize, columnW };
};

export const boardLabelColumnWidth = (labels: readonly string[]) => {
  if (!labels.length) {
    return TIER_LABEL_W;
  }
  return Math.min(
    TIER_LABEL_W_MAX,
    Math.max(
      TIER_LABEL_W,
      ...labels.map((label) => layoutTierLabel(label).columnW),
    ),
  );
};

export const labelFontSize = (label: string) => layoutTierLabel(label).fontSize;
