import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";

export const LS_LIST_PCT = 0.42;
export const LS_PAD = 16;
export const LS_RANK_W = 32;
export const LS_LOGO = 40;
export const LS_GAP = 8;
export const LS_VALUE_W = 114;
export const LS_HERO_KICKER = 20;
export const LS_HERO_FAMILY = 96;
export const LS_HERO_GIVEN = 24;
export const LS_HERO_STAT = 72;
/** Bottom fade as a fraction of the photo pane — enough for the lockup, not a grey veil. */
export const LS_FADE = 0.36;
/** Row type as a fraction of row height, then capped so 5-row leftover does not clip. */
export const LS_RANK_TYPE = 0.18;
export const LS_NAME_TYPE = 0.24;
export const LS_VALUE_TYPE = 0.28;
export const LS_RANK_CAP = 32;
export const LS_NAME_CAP = 38;
export const LS_VALUE_CAP = 54;

export interface LeaderSplitRowCols {
  rankW: number;
  logoW: number;
  gap: number;
  valueW: number;
  nameX: number;
  nameW: number;
}

/** Rank | logo | name | value — same grid for CSS and canvas punch. */
export const leaderSplitRowCols = (rowW: number): LeaderSplitRowCols => {
  const rankW = LS_RANK_W;
  const logoW = LS_LOGO;
  const gap = LS_GAP;
  const valueW = LS_VALUE_W;
  const nameX = rankW + gap + logoW + gap;
  const nameW = Math.max(48, rowW - nameX - gap - valueW);
  return { rankW, logoW, gap, valueW, nameX, nameW };
};

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
