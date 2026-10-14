import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const QT_BA_SIZE = 72;
export const QT_BA_INSET = 36;
export const QT_FADE_H = 520;
export const QT_QUOTE_SIZE = 56;
export const QT_QUOTE_TRACK = 0.02;
export const QT_QUOTE_LINE = 1.06;
export const QT_QUOTE_MAX_LINES = 4;
export const QT_QUOTE_PAD_X = 80;
export const QT_QUOTE_BOTTOM = 156;
export const QT_QUOTE_H = 248;
export const QT_MARK_SIZE = 56;
export const QT_MARK_BOTTOM = 412;
export const QT_LAST_TOP = 128;
export const QT_LAST_SIZE = 96;
export const QT_LAST_LINE = 0.82;
export const QT_LAST_TRACK = 0.04;
export const QT_ATTR_SIZE = 24;
export const QT_ATTR_TRACK = 0.12;
export const QT_ATTR_PLATE_H = 64;
export const QT_ATTR_PLATE_W = 720;
export const QT_ATTR_BOTTOM = 44;
export const QT_PLATE_ACCENT = 12;

export const quoteLastName = (attribution: string) => {
  const parts = attribution.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return (parts.at(-1) ?? "").toUpperCase();
};

export const quoteLastNameSize = (last: string) => {
  if (last.length >= 12) {
    return 56;
  }
  if (last.length >= 9) {
    return 72;
  }
  return QT_LAST_SIZE;
};
