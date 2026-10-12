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
export const TIER_HEADER_H = 156;
export const TIER_FOOTER = 8;
export const TIER_LABEL_W = 140;
export const TIER_LABEL_PAD_X = 8;
export const TIER_LABEL_INNER_W = TIER_LABEL_W - TIER_LABEL_PAD_X * 2;
export const TIER_LABEL_TRACK = 0.02;
/** Long names wrap in the label column; this is not an 8-character typing cap. */
export const TIER_LABEL_MAX_LENGTH = 48;
export const TIER_LABEL_SIZE_ONE = 72;
export const TIER_LABEL_SIZE_TWO = 48;
export const TIER_LABEL_SIZE_LONG = 28;
export const TIER_LABEL_SIZE_MIN = 16;
export const TIER_CELLS_INSET = 8;
export const TIER_PAD_RIGHT = 12;
export const TIER_CELL_GAP = 6;
/** Cap for sparse boards; packed 8-across is still limited by content width. */
export const TIER_CELL_MAX = 440;
/** Logos stay this wide; extra items wrap onto another lane in the same tier. */
export const TIER_WRAP_COLS = 8;
export const TIER_ROW_PAD_Y = 4;
/** Circled BA lockup (white ring + letters). Letters-only mark is `/ba-logo.png`. */
export const BA_LOGO_SRC = "/ba-logo-circled.png";
export const TIER_BADGE_SIZE = 72;
/**
 * Equal inset from the graphic’s top edge and right edge so the lockup is
 * not hugging the right. Matches the header’s vertical centering gap.
 */
export const TIER_BADGE_INSET = (TIER_HEADER_H - TIER_BADGE_SIZE) / 2;
/** 20% larger than the previous 38px compact title. */
export const TIER_TITLE_SIZE = 46;
/** Faded team-logo backdrop behind a player headshot. Fitted to the cell. */
export const PLAYER_LOGO_WATERMARK_ALPHA = 0.22;
export const TIER_TITLE_TRACK = 0.04;

export const cellsContentWidth = () =>
  GRAPHIC_WIDTH - TIER_LABEL_W - TIER_CELLS_INSET - TIER_PAD_RIGHT;

export const rowMetrics = (rowCount: number) => {
  const count = Math.max(1, rowCount);
  const bodyH = GRAPHIC_HEIGHT - TIER_HEADER_H - TIER_FOOTER;
  const rowH = bodyH / count;
  return { bodyH, rowH };
};

/** How many vertical lanes a tier needs so items wrap at 8 per row. */
export const tierLaneCount = (itemCount: number) =>
  Math.max(1, Math.ceil(Math.max(0, itemCount) / TIER_WRAP_COLS));

export const cellSize = (
  laneH: number,
  contentW: number,
  slotCount = TIER_WRAP_COLS,
) => {
  const cols = Math.min(TIER_WRAP_COLS, Math.max(1, slotCount));
  const innerH = Math.max(28, laneH - TIER_ROW_PAD_Y * 2);
  const availableW = contentW - TIER_CELL_GAP * (cols - 1);
  return Math.max(28, Math.min(TIER_CELL_MAX, innerH, availableW / cols));
};

export interface TierBoardLayout {
  lanes: number[];
  totalLanes: number;
  bodyH: number;
  laneH: number;
  size: number;
  contentW: number;
  cols: number;
  gridTemplate: string;
}

/** How many squares a lane actually has to hold (1–8), for sizing. */
export const laneSlotCount = (itemCount: number) =>
  Math.min(TIER_WRAP_COLS, Math.max(1, itemCount));

export const tierBoardLayout = (
  itemCounts: number[],
  labelLineCounts: number[] = [],
): TierBoardLayout => {
  const lanes = itemCounts.map((count, index) =>
    Math.max(tierLaneCount(count), Math.max(1, labelLineCounts[index] ?? 1)),
  );
  const totalLanes = Math.max(1, lanes.reduce((sum, count) => sum + count, 0));
  const bodyH = GRAPHIC_HEIGHT - TIER_HEADER_H - TIER_FOOTER;
  const contentW = cellsContentWidth();
  /** Stretch lanes so the last tier meets the footer, 3–10 rows alike. */
  const laneH = bodyH / totalLanes;
  const cols = itemCounts.length
    ? Math.max(1, ...itemCounts.map((count) => laneSlotCount(count)))
    : 1;
  const size = cellSize(laneH, contentW, cols);
  return {
    lanes,
    totalLanes,
    bodyH,
    laneH,
    size,
    contentW,
    cols,
    gridTemplate: lanes.map((count) => `${count}fr`).join(" "),
  };
};

export const cellGridPosition = (index: number) => ({
  col: index % TIER_WRAP_COLS,
  wrapRow: Math.floor(index / TIER_WRAP_COLS),
});

export const baBadgeRect = () => ({
  x: GRAPHIC_WIDTH - TIER_BADGE_INSET - TIER_BADGE_SIZE,
  y: TIER_BADGE_INSET,
  size: TIER_BADGE_SIZE,
});

const labelWidthAt = (text: string, fontSize: number) =>
  measureTitleAdvance(text.toUpperCase(), TIER_LABEL_TRACK) * fontSize;

const lineFits = (text: string, fontSize: number) =>
  labelWidthAt(text, fontSize) <= TIER_LABEL_INNER_W + 0.01;

export const wrapTierLabel = (label: string, fontSize: number): string[] => {
  const text = label.replace(/\s+/g, " ").trim();
  if (!text) {
    return [" "];
  }
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  const pushWord = (word: string) => {
    if (lineFits(word, fontSize) || fontSize <= TIER_LABEL_SIZE_MIN) {
      current = word;
      return;
    }
    let chunk = "";
    for (const char of word) {
      const next = chunk + char;
      if (chunk && !lineFits(next, fontSize)) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    current = chunk;
  };
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || lineFits(next, fontSize)) {
      current = next;
      continue;
    }
    lines.push(current);
    pushWord(word);
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
}

export const layoutTierLabel = (label: string): TierLabelLayout => {
  const trimmed = label.replace(/\s+/g, " ").trim();
  let fontSize = startingLabelSize(trimmed);
  while (fontSize > TIER_LABEL_SIZE_MIN) {
    const lines = wrapTierLabel(trimmed, fontSize);
    const overflow = lines.some((line) => !lineFits(line.trim() || " ", fontSize));
    if (!overflow && lines.length <= 4) {
      return { lines, fontSize };
    }
    fontSize -= 1;
  }
  return {
    lines: wrapTierLabel(trimmed, TIER_LABEL_SIZE_MIN),
    fontSize: TIER_LABEL_SIZE_MIN,
  };
};

export const labelFontSize = (label: string) => layoutTierLabel(label).fontSize;
