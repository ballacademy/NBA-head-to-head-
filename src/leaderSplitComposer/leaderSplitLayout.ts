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
export const LS_MAST_H = 128;
export const LS_MAST_GAP = 16;
export const LS_PLATE_GAP = 10;
export const LS_HERO_GIVEN = 24;
export const LS_HERO_FAMILY = 96;
export const LS_HERO_STAT = 72;
export const LS_MAST_TYPE = 44;
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
export const leaderSplitRowCols = (
  rowW: number,
  hideLogo = false,
): LeaderSplitRowCols => {
  const rankW = LS_RANK_W;
  const logoW = hideLogo ? 0 : LS_LOGO;
  const gap = LS_GAP;
  const valueW = LS_VALUE_W;
  const nameX = rankW + gap + (logoW > 0 ? logoW + gap : 0);
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
  mast: LeaderSplitRect;
  rows: LeaderSplitRect;
  rowH: number;
  rowGap: number;
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
  plates = true,
): LeaderSplitBoardLayout => {
  const n = Math.max(0, rowCount);
  const listW = Math.round(GRAPHIC_WIDTH * LS_LIST_PCT);
  const photoW = GRAPHIC_WIDTH - listW;
  const listX = mirror ? photoW : 0;
  const photoX = mirror ? 0 : listW;
  const innerW = Math.max(0, listW - LS_PAD * 2);
  const mast: LeaderSplitRect = {
    x: listX + LS_PAD,
    y: LS_PAD,
    w: innerW,
    h: LS_MAST_H,
  };
  const rowsY = LS_PAD + LS_MAST_H + LS_MAST_GAP;
  const rowsH = Math.max(0, boardH - rowsY - LS_PAD);
  const rowGap = plates && n > 1 ? LS_PLATE_GAP : 0;
  const rowH = n > 0 ? (rowsH - rowGap * (n - 1)) / n : 0;
  return {
    list: { x: listX, y: 0, w: listW, h: boardH },
    photo: { x: photoX, y: 0, w: photoW, h: boardH },
    mast,
    rows: {
      x: listX + LS_PAD,
      y: rowsY,
      w: innerW,
      h: rowsH,
    },
    rowH,
    rowGap,
  };
};
