import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const HL_PAD_X = 64;
export const HL_BA_SIZE = 72;
export const HL_BA_INSET = 36;
export const HL_TYPE_BOTTOM = 52;
export const HL_HEADLINE_H = 96;
export const HL_HEADLINE_SIZE = 58;
export const HL_HEADLINE_TRACK = 0.06;
export const HL_HEADLINE_PAD_X = 22;
export const HL_BODY_SIZE = 28;
export const HL_BODY_TRACK = 0.08;
export const HL_BODY_LINE = 1.15;
export const HL_PLATE_BODY_GAP = 18;
export const HL_WORDMARK_SIZE = 22;
export const HL_CITY_SIZE = 78;
export const HL_NICK_SIZE = 92;
export const HL_WORDMARK_LINE = 0.82;
export const HL_CITY_NICK_GAP = 4;
export const HL_WORDMARK_PLATE_GAP = 22;
export const HL_WORDMARK_TRACK = 0.02;
export const HL_WATERMARK = 0.12;
export const HL_WATERMARK_SIZE = 520;
export const HL_WATERMARK_TOP = 170;
export const HL_FADE_H = 560;

/** Wordmark sits above the banner with a gap — never through the plate. */
export const headlineWordmarkHeight = (hasTeam: boolean) =>
  hasTeam
    ? HL_CITY_SIZE * HL_WORDMARK_LINE +
      HL_CITY_NICK_GAP +
      HL_NICK_SIZE * HL_WORDMARK_LINE
    : 0;

export const headlinePlateY = (bodyLines: number, _hasTeam = false) => {
  const bodyBlock =
    bodyLines > 0 ? bodyLines * HL_BODY_SIZE * HL_BODY_LINE + HL_PLATE_BODY_GAP : 0;
  return GRAPHIC_HEIGHT - HL_TYPE_BOTTOM - bodyBlock - HL_HEADLINE_H;
};

export const headlineTypeStack = (bodyLines: number, hasTeam: boolean) => {
  const plateTop = headlinePlateY(bodyLines, hasTeam);
  const plateBottom = plateTop + HL_HEADLINE_H;
  const nickH = HL_NICK_SIZE * HL_WORDMARK_LINE;
  const cityH = HL_CITY_SIZE * HL_WORDMARK_LINE;
  const nickBottom = plateTop - HL_WORDMARK_PLATE_GAP;
  const nickTop = nickBottom - nickH;
  const cityBottom = nickTop - HL_CITY_NICK_GAP;
  const cityTop = cityBottom - cityH;
  return {
    cityTop,
    cityBottom,
    nickTop,
    nickBottom,
    plateTop,
    plateBottom,
    watermarkBottom: HL_WATERMARK_TOP + HL_WATERMARK_SIZE,
  };
};
