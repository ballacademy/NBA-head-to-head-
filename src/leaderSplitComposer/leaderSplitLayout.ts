import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";

export const LS_LIST_PCT = 0.42;
export const LS_PAD = 24;
export const LS_HERO_KICKER = 18;
export const LS_HERO_FAMILY = 96;
export const LS_HERO_GIVEN = 22;
export const LS_HERO_STAT = 64;

export interface LeaderSplitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LeaderSplitBoardLayout {
  list: LeaderSplitRect;
  photo: LeaderSplitRect;
  rows: LeaderSplitRect;
  rowH: number;
}

export const leaderSplitBoardHeight = (story = false, square = false) => {
  if (story) {
    return STORY_DESIGN_HEIGHT;
  }
  if (square) {
    return GRAPHIC_WIDTH;
  }
  return GRAPHIC_HEIGHT;
};

/** 42% list / 58% photo, side-by-side. Extra 9:16 / 1:1 height stays on the crop. */
export const leaderSplitLayout = (
  rowCount: number,
  mirror = false,
  boardH = GRAPHIC_HEIGHT,
): LeaderSplitBoardLayout => {
  const n = Math.max(0, rowCount);
  const listW = Math.round(GRAPHIC_WIDTH * LS_LIST_PCT);
  const photoW = GRAPHIC_WIDTH - listW;
  const listX = mirror ? photoW : 0;
  const photoX = mirror ? 0 : listW;
  const usableH = Math.max(0, boardH - LS_PAD * 2);
  const rowH = n > 0 ? usableH / n : 0;
  return {
    list: { x: listX, y: 0, w: listW, h: boardH },
    photo: { x: photoX, y: 0, w: photoW, h: boardH },
    rows: {
      x: listX + LS_PAD,
      y: LS_PAD,
      w: Math.max(0, listW - LS_PAD * 2),
      h: usableH,
    },
    rowH,
  };
};
