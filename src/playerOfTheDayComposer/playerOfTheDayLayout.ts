import {
  IMPROVE_RIM_BLACK,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const POTD_CRACKS_SRC = "/player-of-the-day-cracks.png";
export const POTD_PAD_X = 64;
export const POTD_GAP = 32;
export const POTD_CARD_W = (GRAPHIC_WIDTH - POTD_PAD_X * 2 - POTD_GAP) / 2;

export const POTD_HEADER_H = 268;
export const POTD_FOOTER = 28;
export const POTD_NAME_H = 116;
export const POTD_RESULT_H = 52;
export const POTD_STATS_H = 236;
export const POTD_TITLE_SIZE = 52;
export const POTD_BRAND_SIZE = 28;
export const POTD_DATE_SIZE = 22;
export const POTD_STAT_SIZE = 38;
export const POTD_NAME_SIZE = 36;
/** Overlay frame around the photo — sits above the image so custom fills cannot hide it. */
export const POTD_PHOTO_BORDER = 4;
export const POTD_PHOTO_BORDER_CLASSIC = "#ffffff";
export const POTD_PHOTO_BORDER_IMPROVE = IMPROVE_RIM_BLACK;
export const POTD_TOTAL_SIZE = 20;
export const POTD_LOGO_WATERMARK = 0.2;

export const potdCardX = (index: number) =>
  POTD_PAD_X + index * (POTD_CARD_W + POTD_GAP);

export const mixHex = (hex: string, other: string, amount: number) => {
  const parse = (value: string) => {
    const raw = value.replace("#", "");
    return {
      r: Number.parseInt(raw.slice(0, 2), 16) || 0,
      g: Number.parseInt(raw.slice(2, 4), 16) || 0,
      b: Number.parseInt(raw.slice(4, 6), 16) || 0,
    };
  };
  const a = parse(hex);
  const b = parse(other);
  const t = Math.min(1, Math.max(0, amount));
  const ch = (left: number, right: number) =>
    Math.round(left + (right - left) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(a.r, b.r)}${ch(a.g, b.g)}${ch(a.b, b.b)}`;
};

export const statsFillForTeam = (teamId: string | null) => {
  if (!teamId) {
    return "#1a1a1a";
  }
  return mixHex(getTeamColors(teamId).primary, "#070707", 0.42);
};

export const potdPhotoBorderColor = (look?: ComposerLook | null) =>
  look === "improve" ? POTD_PHOTO_BORDER_IMPROVE : POTD_PHOTO_BORDER_CLASSIC;

/** Center of a value-then-label pair in the two-column stats panel. */
export const potdStatCell = (
  cardX: number,
  cardW: number,
  statsY: number,
  statsH: number,
  index: number,
) => {
  const col = index % 2;
  const row = Math.floor(index / 2);
  const colW = cardW / 2;
  const padY = statsH * 0.1;
  const rowH = (statsH - padY * 2) / 4;
  return {
    cx: cardX + colW * (col + 0.5),
    cy: statsY + padY + rowH * (row + 0.5),
  };
};

export const paintPotdPhotoBorder = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  look?: ComposerLook | null,
) => {
  const line = Math.max(2, POTD_PHOTO_BORDER * scale);
  context.save();
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.strokeStyle = potdPhotoBorderColor(look);
  context.lineWidth = line;
  context.strokeRect(x + line / 2, y + line / 2, w - line, h - line);
  context.restore();
};

export const coverPanDraw = (
  imageW: number,
  imageH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  panX: number,
  panY: number,
  zoom = 1,
) => {
  const scale =
    Math.max(w / Math.max(1, imageW), h / Math.max(1, imageH)) *
    Math.max(1, zoom);
  const dw = imageW * scale;
  const dh = imageH * scale;
  return {
    dx: x + (w - dw) * Math.min(1, Math.max(0, panX)),
    dy: y + (h - dh) * Math.min(1, Math.max(0, panY)),
    dw,
    dh,
  };
};
