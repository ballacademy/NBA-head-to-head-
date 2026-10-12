import {
  FRAME_BLACK,
  FRAME_WHITE,
  frameColor,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

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
export const POTD_PHOTO_BORDER_WHITE = FRAME_WHITE;
export const POTD_PHOTO_BORDER_BLACK = FRAME_BLACK;
export const POTD_PHOTO_BORDER_CLASSIC = POTD_PHOTO_BORDER_WHITE;
export const POTD_PHOTO_BORDER_IMPROVE = POTD_PHOTO_BORDER_BLACK;
/** Modest card radius for the two player columns only. Grids stay square. */
export const POTD_CARD_RADIUS = 14;
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
  frameColor(look);

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

export const addRoundRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number | readonly [number, number, number, number],
) => {
  const [tl, tr, br, bl] =
    typeof radii === "number" ? [radii, radii, radii, radii] : radii;
  const cap = Math.max(0, Math.min(w, h) / 2);
  const clamp = (value: number) => Math.max(0, Math.min(value, cap));
  const corners = [clamp(tl), clamp(tr), clamp(br), clamp(bl)] as [
    number,
    number,
    number,
    number,
  ];
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, w, h, corners);
    return;
  }
  context.moveTo(x + corners[0], y);
  context.lineTo(x + w - corners[1], y);
  context.quadraticCurveTo(x + w, y, x + w, y + corners[1]);
  context.lineTo(x + w, y + h - corners[2]);
  context.quadraticCurveTo(x + w, y + h, x + w - corners[2], y + h);
  context.lineTo(x + corners[3], y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - corners[3]);
  context.lineTo(x, y + corners[0]);
  context.quadraticCurveTo(x, y, x + corners[0], y);
  context.closePath();
};

export const paintPotdPlateBorder = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  look?: ComposerLook | null,
  radii: number | readonly [number, number, number, number] = 0,
) => {
  const line = Math.max(2, POTD_PHOTO_BORDER * scale);
  const insetRadii: number | [number, number, number, number] =
    typeof radii === "number"
      ? Math.max(0, radii - line / 2)
      : [
          Math.max(0, radii[0] - line / 2),
          Math.max(0, radii[1] - line / 2),
          Math.max(0, radii[2] - line / 2),
          Math.max(0, radii[3] - line / 2),
        ];
  context.save();
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.strokeStyle = potdPhotoBorderColor(look);
  context.lineWidth = line;
  context.beginPath();
  addRoundRectPath(
    context,
    x + line / 2,
    y + line / 2,
    w - line,
    h - line,
    insetRadii,
  );
  context.stroke();
  context.restore();
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
  const radius = POTD_CARD_RADIUS * scale;
  paintPotdPlateBorder(context, x, y, w, h, scale, look, [
    radius,
    radius,
    0,
    0,
  ]);
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
