import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";

export const LB_PHOTO_H = 620;
export const LB_TITLE_H = 118;
export const LB_PAD_X = 48;
export const LB_PAD_Y = 20;
export const LB_GAP = 8;

export const leaderBarsPhotoRect = (
  photoOnTop: boolean,
  boardH = GRAPHIC_HEIGHT,
) => {
  const photoH = photoOnTop
    ? Math.round(boardH * (LB_PHOTO_H / GRAPHIC_HEIGHT))
    : Math.round(boardH * 0.38);
  if (photoOnTop) {
    return { x: 0, y: 0, w: GRAPHIC_WIDTH, h: photoH };
  }
  return { x: 0, y: boardH - photoH, w: GRAPHIC_WIDTH, h: photoH };
};

export const leaderBarsTitleRect = (
  photoOnTop: boolean,
  boardH = GRAPHIC_HEIGHT,
) => {
  const photo = leaderBarsPhotoRect(photoOnTop, boardH);
  const h = LB_TITLE_H;
  const y = photoOnTop ? photo.h : 28;
  return { x: LB_PAD_X, y, w: GRAPHIC_WIDTH - LB_PAD_X * 2, h };
};

export const leaderBarsBoardRect = (
  photoOnTop: boolean,
  boardH = GRAPHIC_HEIGHT,
) => {
  const photo = leaderBarsPhotoRect(photoOnTop, boardH);
  const title = leaderBarsTitleRect(photoOnTop, boardH);
  if (photoOnTop) {
    const y = title.y + title.h + LB_PAD_Y;
    return {
      x: LB_PAD_X,
      y,
      w: GRAPHIC_WIDTH - LB_PAD_X * 2,
      h: boardH - y - 28,
    };
  }
  return {
    x: LB_PAD_X,
    y: title.y + title.h + 12,
    w: GRAPHIC_WIDTH - LB_PAD_X * 2,
    h: photo.y - (title.y + title.h) - 20,
  };
};

export const leaderBarRowH = (boardH: number, count: number) => {
  const rect = leaderBarsBoardRect(true, boardH);
  const n = Math.max(1, count);
  return Math.min(64, (rect.h - LB_GAP * (n - 1)) / n);
};
