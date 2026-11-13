import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export const LB_TITLE_H = 118;
export const LB_PAD_X = 48;
export const LB_TITLE_PAD = 16;
export const LB_FLOOR = 16;
export const LB_GAP = 8;
/** Even packed row — tall enough for 50–64u values. Leftover goes to the photo. */
export const LB_ROW_H = 80;
export const LB_VALUE_SIZE = 56;
export const LB_NAME_SIZE = 28;
export const LB_RANK_SIZE = 16;
export const LB_TRACK_H = 22;
export const LB_TRACK_GOLD_H = 36;
export const LB_NAME_FADE_H = 240;
export const LB_HERO_FAMILY = 64;
export const LB_HERO_GIVEN = 22;
export const LB_HERO_STAT = 44;
export const LB_HERO_LOGO = 64;

export interface LeaderBarsRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LeaderBarsBoardLayout {
  photo: LeaderBarsRect;
  title: LeaderBarsRect;
  board: LeaderBarsRect;
  rowH: number;
}

/** Photo leftover after a tight title + n even rows packed to the floor. */
export const leaderBarsLayout = (
  rowCount: number,
  photoOnTop = true,
  boardH = GRAPHIC_HEIGHT,
): LeaderBarsBoardLayout => {
  const n = Math.max(0, rowCount);
  const rowH = n > 0 ? LB_ROW_H : 0;
  const barsH = n > 0 ? n * LB_ROW_H + (n - 1) * LB_GAP : 0;
  const titleW = GRAPHIC_WIDTH - LB_PAD_X * 2;
  const title: LeaderBarsRect = {
    x: LB_PAD_X,
    y: 0,
    w: titleW,
    h: LB_TITLE_H,
  };
  if (photoOnTop) {
    const stackH = LB_TITLE_H + (n > 0 ? LB_TITLE_PAD + barsH : 0) + LB_FLOOR;
    const photoH = Math.max(160, boardH - stackH);
    const photo = { x: 0, y: 0, w: GRAPHIC_WIDTH, h: photoH };
    title.y = photoH;
    const barsY = title.y + title.h + (n > 0 ? LB_TITLE_PAD : 0);
    return {
      photo,
      title,
      board: { x: LB_PAD_X, y: barsY, w: titleW, h: barsH },
      rowH,
    };
  }
  title.y = 28;
  const barsY = title.y + title.h + (n > 0 ? LB_TITLE_PAD : 0);
  const photoY = n > 0 ? barsY + barsH : title.y + title.h + LB_FLOOR;
  return {
    photo: {
      x: 0,
      y: photoY,
      w: GRAPHIC_WIDTH,
      h: Math.max(160, boardH - photoY),
    },
    title,
    board: { x: LB_PAD_X, y: barsY, w: titleW, h: barsH },
    rowH,
  };
};

export const leaderBarsPhotoRect = (
  photoOnTop: boolean,
  boardH = GRAPHIC_HEIGHT,
  rowCount = 8,
) => leaderBarsLayout(rowCount, photoOnTop, boardH).photo;

export const leaderBarsTitleRect = (
  photoOnTop: boolean,
  boardH = GRAPHIC_HEIGHT,
  rowCount = 8,
) => leaderBarsLayout(rowCount, photoOnTop, boardH).title;

export const leaderBarsBoardRect = (
  photoOnTop: boolean,
  boardH = GRAPHIC_HEIGHT,
  rowCount = 8,
) => leaderBarsLayout(rowCount, photoOnTop, boardH).board;

export const leaderBarRowH = (_boardH: number, _count: number) => LB_ROW_H;
