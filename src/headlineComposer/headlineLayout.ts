import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export type HeadlineWatermark = "off" | "behind" | "small";

export const HL_WATERMARK_MODES = ["off", "behind", "small"] as const;

export const parseHeadlineWatermark = (value: unknown): HeadlineWatermark =>
  value === "off" || value === "small" || value === "behind" ? value : "behind";

export const HL_PAD_X = 64;
export const HL_BA_SIZE = 72;
export const HL_BA_INSET = 36;
export const HL_TYPE_BOTTOM = 48;
export const HL_HEADLINE_H = 108;
export const HL_HEADLINE_SIZE = 56;
export const HL_HEADLINE_TRACK = 0.06;
export const HL_HEADLINE_PAD_X = 28;
export const HL_PLATE_ROTATE = -2.1;
export const HL_PLATE_FILL = "#0c0c0c";
export const HL_PLATE_ACCENT = 10;
export const HL_BODY_SIZE = 32;
export const HL_BODY_TRACK = 0.1;
export const HL_BODY_LINE = 1.12;
export const HL_PLATE_BODY_GAP = 22;
export const HL_CITY_SIZE = 70;
export const HL_NICK_SIZE = 94;
export const HL_WORDMARK_LINE = 0.82;
export const HL_CITY_OVERLAP = 34;
export const HL_NICK_OVERLAP = 40;
export const HL_WORDMARK_TRACK = 0.02;
export const HL_WATERMARK = 0.14;
export const HL_MARK_BEHIND_SIZE = 560;
export const HL_MARK_SMALL_SIZE = 128;
export const HL_MARK_SMALL_INSET = 48;
export const HL_FADE_H = 640;
export const HL_FACE_SAFE = 720;

/** Jagged torn-ticket outline, unit coords of the headline plate. */
export const HL_TORN_POINTS: Array<[number, number]> = [
  [0.0, 0.2],
  [0.035, 0.04],
  [0.1, 0.16],
  [0.175, 0.0],
  [0.27, 0.13],
  [0.37, 0.02],
  [0.48, 0.15],
  [0.58, 0.0],
  [0.69, 0.12],
  [0.78, 0.02],
  [0.875, 0.14],
  [0.95, 0.03],
  [1.0, 0.18],
  [1.0, 0.82],
  [0.95, 0.98],
  [0.86, 0.88],
  [0.76, 1.0],
  [0.65, 0.9],
  [0.54, 1.0],
  [0.43, 0.88],
  [0.32, 1.0],
  [0.21, 0.9],
  [0.11, 1.0],
  [0.04, 0.86],
  [0.0, 0.94],
];

export const HL_TORN_CLIP = HL_TORN_POINTS.map(
  ([x, y]) => `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`,
).join(", ");

export const headlineBodyBlock = (bodyLines: number) =>
  bodyLines > 0
    ? bodyLines * HL_BODY_SIZE * HL_BODY_LINE + HL_PLATE_BODY_GAP
    : 0;

export const headlineTypeStack = (bodyLines: number, _hasTeam = false) => {
  const bodyBlock = headlineBodyBlock(bodyLines);
  const nickH = HL_NICK_SIZE * HL_WORDMARK_LINE;
  const cityH = HL_CITY_SIZE * HL_WORDMARK_LINE;
  const nickBottom = GRAPHIC_HEIGHT - HL_TYPE_BOTTOM - bodyBlock;
  const nickTop = nickBottom - nickH;
  const plateBottom = nickTop + HL_NICK_OVERLAP;
  const plateTop = plateBottom - HL_HEADLINE_H;
  const cityBottom = plateTop + HL_CITY_OVERLAP;
  const cityTop = cityBottom - cityH;
  return {
    cityTop,
    cityBottom,
    nickTop,
    nickBottom,
    plateTop,
    plateBottom,
  };
};

export const headlineWatermarkBox = (
  mode: HeadlineWatermark,
  stack: ReturnType<typeof headlineTypeStack>,
) => {
  if (mode === "small") {
    const size = HL_MARK_SMALL_SIZE;
    return {
      size,
      x: GRAPHIC_WIDTH - HL_MARK_SMALL_INSET - size,
      y: GRAPHIC_HEIGHT - HL_TYPE_BOTTOM - size,
      opacity: 0.92,
    };
  }
  const size = HL_MARK_BEHIND_SIZE;
  const cx = GRAPHIC_WIDTH / 2;
  const cy = (stack.plateTop + stack.plateBottom) / 2;
  return {
    size,
    x: cx - size / 2,
    y: cy - size / 2,
    opacity: HL_WATERMARK,
  };
};
