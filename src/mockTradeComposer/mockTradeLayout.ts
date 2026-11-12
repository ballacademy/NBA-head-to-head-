import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";

export {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
};

export const MT_PAD = 22;
export const MT_TITLE_TOP = 22;
export const MT_TITLE_H = 78;
export const MT_TITLE_SIZE = 40;
export const MT_GAP = 10;
export const MT_BA = 58;
export const MT_CHIP_H = 64;
export const MT_CHIP_GAP = 10;
export const MT_CHIP_INSET = 12;
export const MT_PLAYER_GAP = 8;
export const MT_NAME_FADE_H = 110;

export interface MockTradeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MockTradePlayerRect extends MockTradeRect {
  photo: MockTradeRect;
  name: MockTradeRect;
}

export interface MockTradeColumnLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  logo: MockTradeRect;
  players: MockTradePlayerRect[];
  picks: MockTradeRect[];
}

export interface MockTradeBoardLayout {
  title: MockTradeRect;
  ba: MockTradeRect;
  columns: MockTradeColumnLayout[];
}

export const mockTradeBoardHeight = (story = false) =>
  story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;

const playerGrid = (count: number): { cols: number; rows: number } => {
  if (count <= 1) {
    return { cols: 1, rows: 1 };
  }
  if (count === 2) {
    return { cols: 1, rows: 2 };
  }
  if (count === 3) {
    return { cols: 1, rows: 3 };
  }
  return { cols: 2, rows: 2 };
};

const packPlayers = (
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
): MockTradePlayerRect[] => {
  if (count <= 0 || w <= 0 || h <= 0) {
    return [];
  }
  const gap = MT_PLAYER_GAP;
  const { cols, rows } = playerGrid(count);
  const cellW = (w - gap * (cols - 1)) / cols;
  const cellH = (h - gap * (rows - 1)) / rows;
  const fadeH = Math.min(MT_NAME_FADE_H, Math.max(64, cellH * 0.22));
  return Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cx = x + col * (cellW + gap);
    const cy = y + row * (cellH + gap);
    const photo = { x: cx, y: cy, w: cellW, h: cellH };
    return {
      ...photo,
      photo,
      name: {
        x: cx,
        y: cy + cellH - fadeH,
        w: cellW,
        h: fadeH,
      },
    };
  });
};

const packPicks = (
  x: number,
  y: number,
  w: number,
  count: number,
  three: boolean,
): MockTradeRect[] => {
  if (count <= 0 || w <= 0) {
    return [];
  }
  const gap = MT_CHIP_GAP;
  const minChip = three ? 160 : 200;
  const maxCols = three ? 1 : 2;
  const cols = Math.max(
    1,
    Math.min(count, maxCols, Math.floor((w + gap) / (minChip + gap))),
  );
  const chipW = (w - gap * (cols - 1)) / cols;
  return Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: x + col * (chipW + gap),
      y: y + row * (MT_CHIP_H + gap),
      w: chipW,
      h: MT_CHIP_H,
    };
  });
};

export const mockTradeLayout = (
  teamCount: 2 | 3,
  playerCounts: number[],
  pickCounts: number[],
  story = false,
): MockTradeBoardLayout => {
  const n = teamCount === 3 ? 3 : 2;
  const boardH = mockTradeBoardHeight(story);
  const title: MockTradeRect = {
    x: MT_PAD,
    y: MT_TITLE_TOP,
    w: GRAPHIC_WIDTH - MT_PAD * 2,
    h: MT_TITLE_H,
  };
  const ba: MockTradeRect = {
    x: GRAPHIC_WIDTH - MT_PAD - 10 - MT_BA,
    y: MT_TITLE_TOP + (MT_TITLE_H - MT_BA) / 2,
    w: MT_BA,
    h: MT_BA,
  };
  const bodyY = MT_TITLE_TOP + MT_TITLE_H + MT_GAP;
  const bodyH = boardH - bodyY - MT_PAD;
  const colW = (GRAPHIC_WIDTH - MT_PAD * 2 - MT_GAP * (n - 1)) / n;
  const columns: MockTradeColumnLayout[] = Array.from({ length: n }, (_, index) => {
    const x = MT_PAD + index * (colW + MT_GAP);
    const y = bodyY;
    const w = colW;
    const h = bodyH;
    const pickCount = Math.max(0, pickCounts[index] ?? 0);
    const playerCount = Math.max(0, playerCounts[index] ?? 0);
    const innerX = x + MT_CHIP_INSET;
    const innerW = w - MT_CHIP_INSET * 2;
    const pickMin = n === 3 ? 160 : 200;
    const pickMaxCols = n === 3 ? 1 : 2;
    const pickCols = Math.max(
      1,
      Math.min(
        pickCount || 1,
        pickMaxCols,
        Math.floor((innerW + MT_CHIP_GAP) / (pickMin + MT_CHIP_GAP)),
      ),
    );
    const pickRows = pickCount ? Math.ceil(pickCount / pickCols) : 0;
    const picksH = pickRows
      ? pickRows * MT_CHIP_H + (pickRows - 1) * MT_CHIP_GAP
      : 0;
    const picksY = y + h - (pickCount ? MT_CHIP_INSET + picksH : 0);
    const playersBottom = pickCount ? picksY - MT_CHIP_INSET : y + h;
    const playersH = Math.max(48, playersBottom - y);
    return {
      x,
      y,
      w,
      h,
      logo: { x, y, w, h },
      players: packPlayers(x, y, w, playersH, playerCount),
      picks: packPicks(innerX, picksY, innerW, pickCount, n === 3),
    };
  });
  return { title, ba, columns };
};
