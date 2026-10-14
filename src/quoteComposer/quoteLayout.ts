import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const QT_BA_SIZE = 72;
export const QT_BA_INSET = 36;
export const QT_FADE_H = 720;
export const QT_QUOTE_SIZE = 72;
export const QT_QUOTE_TRACK = 0.02;
export const QT_QUOTE_LINE = 1.02;
export const QT_QUOTE_MAX_LINES = 5;
export const QT_QUOTE_PAD_X = 88;
export const QT_QUOTE_BOTTOM = 196;
export const QT_MARK_SIZE = 220;
export const QT_MARK_X = 72;
export const QT_MARK_BOTTOM = 430;
export const QT_GHOST_SIZE = 180;
export const QT_GHOST_Y = 1180;
export const QT_ATTR_SIZE = 26;
export const QT_ATTR_TRACK = 0.12;
export const QT_ATTR_PLATE_H = 64;
export const QT_ATTR_PLATE_W = 640;
export const QT_ATTR_BOTTOM = 56;
export const QT_RAIL_W = 10;

export const quoteGhostName = (attribution: string) => {
  const parts = attribution.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return (parts.at(-1) ?? "").toUpperCase();
};
