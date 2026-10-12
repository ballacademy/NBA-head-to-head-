import { getTeamColors } from "../lib/teamColors";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const POTD_CRACKS_SRC = "/player-of-the-day-cracks.png";
export const POTD_BA_SRC = "/ba-logo-circled.png";
export const POTD_BADGE_SIZE = 64;
export const POTD_BADGE_INSET = 16;
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
export const POTD_STAT_SIZE = 28;
export const POTD_NAME_SIZE = 28;
export const POTD_TOTAL_SIZE = 20;
export const POTD_LOGO_WATERMARK = 0.2;

export const potdBadgeRect = () => ({
  x: GRAPHIC_WIDTH - POTD_BADGE_INSET - POTD_BADGE_SIZE,
  y: POTD_BADGE_INSET,
  size: POTD_BADGE_SIZE,
});

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

export const coverPanDraw = (
  imageW: number,
  imageH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  panX: number,
  panY: number,
) => {
  const scale = Math.max(w / Math.max(1, imageW), h / Math.max(1, imageH));
  const dw = imageW * scale;
  const dh = imageH * scale;
  return {
    dx: x + (w - dw) * Math.min(1, Math.max(0, panX)),
    dy: y + (h - dh) * Math.min(1, Math.max(0, panY)),
    dw,
    dh,
  };
};
