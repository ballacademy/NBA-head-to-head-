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
export const MT_GETS_H = 38;
export const MT_GETS_SIZE = 13;
export const MT_NAME_H = 28;
export const MT_NAME_SIZE = 16;
export const MT_CHIP_H = 34;
export const MT_CHIP_GAP = 7;
export const MT_COL_INSET = 16;
export const MT_PLAYER_GAP = 10;

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
  gets: MockTradeRect;
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

const packPlayers = (
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  three: boolean,
): MockTradePlayerRect[] => {
  if (count <= 0 || w <= 0 || h <= 0) {
    return [];
  }
  const gap = MT_PLAYER_GAP;
  const cols =
    count === 1 ? 1 : count === 2 ? (three ? 1 : 2) : count === 3 ? (three ? 1 : 3) : 2;
  const rows = Math.ceil(count / cols);
  const cellW = (w - gap * (cols - 1)) / cols;
  const cellH = (h - gap * (rows - 1)) / rows;
  const nameH = Math.min(MT_NAME_H, Math.max(18, cellH * 0.18));
  const maxPhotoW = three ? 168 : count === 1 ? 280 : 210;
  return Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cx = x + col * (cellW + gap);
    const cy = y + row * (cellH + gap);
    const photoH = Math.max(36, cellH - nameH);
    const photoW = Math.min(cellW, photoH * 0.86, maxPhotoW);
    const photoBoxH = Math.min(photoH, photoW / 0.78);
    const photoX = cx + (cellW - photoW) / 2;
    const photoY = cy + Math.max(0, (photoH - photoBoxH) / 2);
    return {
      x: cx,
      y: cy,
      w: cellW,
      h: cellH,
      photo: { x: photoX, y: photoY, w: photoW, h: photoBoxH },
      name: {
        x: cx,
        y: photoY + photoBoxH + 2,
        w: cellW,
        h: nameH,
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
  const minChip = three ? 150 : 200;
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
    const inset = MT_COL_INSET;
    const innerX = x + inset;
    const innerW = w - inset * 2;
    const pickCount = Math.max(0, pickCounts[index] ?? 0);
    const playerCount = Math.max(0, playerCounts[index] ?? 0);
    const pickMin = n === 3 ? 150 : 200;
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
    const picksY = y + h - inset - picksH;
    const logoH = h * (n === 3 ? 0.3 : 0.36);
    const logo: MockTradeRect = {
      x: innerX,
      y: y + inset,
      w: innerW,
      h: logoH,
    };
    const gets: MockTradeRect = {
      x: innerX,
      y: y + inset + logoH + 4,
      w: innerW,
      h: MT_GETS_H,
    };
    const playersY = gets.y + gets.h + 8;
    const playersBottom = (pickCount ? picksY - 12 : y + h - inset);
    const playersH = Math.max(48, playersBottom - playersY);
    return {
      x,
      y,
      w,
      h,
      logo,
      gets,
      players: packPlayers(innerX, playersY, innerW, playersH, playerCount, n === 3),
      picks: packPicks(innerX, picksY, innerW, pickCount, n === 3),
    };
  });
  return { title, ba, columns };
};
