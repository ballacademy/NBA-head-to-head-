import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const STC_PHOTO_W = 748;
export const STC_STATS_X = 748;
export const STC_STATS_W = 340;
export const STC_NAME_W = 112;
export const STC_NAME_X = 1088;
export const STC_HAIRLINE = 6;
export const STC_BA_SIZE = 72;
export const STC_BA_INSET = 28;
export const STC_STAT_COUNT = 3;
export const STC_PANEL = "#ececec";
export const STC_INK = "#111111";
export const STC_MUTED = "rgba(17, 17, 17, 0.62)";
export const STC_RULE = "rgba(17, 17, 17, 0.22)";
export const STC_VALUE_SIZE = 108;
export const STC_LABEL_SIZE = 26;
export const STC_NAME_SIZE = 40;
export const STC_NAME_TRACK = 0.14;
export const STC_LOGO = 92;
export const STC_LOGO_INSET = 16;
export const STC_DIVIDER = 2;

export const inkOnHex = (hex: string) => {
  const raw = hex.replace("#", "");
  const r = Number.parseInt(raw.slice(0, 2), 16) || 0;
  const g = Number.parseInt(raw.slice(2, 4), 16) || 0;
  const b = Number.parseInt(raw.slice(4, 6), 16) || 0;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.58 ? "#111111" : "#ffffff";
};

export const statCardRows = (count = STC_STAT_COUNT) => {
  const h = GRAPHIC_HEIGHT / count;
  return Array.from({ length: count }, (_, index) => ({
    y: index * h,
    h,
    valueY: index * h + h * 0.46,
    labelY: index * h + h * 0.72,
    ruleY: index * h + h,
  }));
};
