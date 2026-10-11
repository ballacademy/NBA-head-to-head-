import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "./rankingState";

/** Fraction of the 4:5 board given to the header (brand + banner). */
export const HEADER_RATIO = 0.17866;

/** BALLACADEMY size in 1200-wide board units (was 24). */
export const BRAND_FONT = 28;
export const BRAND_TRACKING_EM = 0.18;
/** Old 32+24 slot so the title banner does not move. */
export const BRAND_SLOT = 56;
export const BANNER_MARGIN_TOP = 16;
export const BANNER_MARGIN_BOTTOM = 26;

/** Banner SVG viewBox — CSS slots and canvas map to this. */
export const BANNER_VIEW = { width: 1200, height: 200 } as const;

/** Banner outline in viewBox units. */
export const BANNER_SHAPE = {
  insetX: 18,
  top: 8,
  /** Bottom of the wide upper bar / top of the conference notch. */
  waist: 118,
  bottom: 192,
} as const;

export const TITLE_BAND = {
  topFrac: BANNER_SHAPE.top / BANNER_VIEW.height,
  heightFrac: (BANNER_SHAPE.waist - BANNER_SHAPE.top) / BANNER_VIEW.height,
} as const;

export const SUB_BAND = {
  topFrac: BANNER_SHAPE.waist / BANNER_VIEW.height,
  heightFrac: (BANNER_SHAPE.bottom - BANNER_SHAPE.waist) / BANNER_VIEW.height,
} as const;

export const SUB_FONT = 30;
export { STANDINGS_TITLE_SIZE, STANDINGS_TITLE_TRACK } from "./rankingState";
/**
 * Raise conference caps toward the shoulder (fraction of inner notch height).
 * Original layout used the geometric pocket center (lift 0).
 */
export const SUB_OPTICAL_LIFT = 0.22;

export interface BannerNotch {
  left: number;
  right: number;
}

const DEFAULT_NOTCH: BannerNotch = { left: 360, right: 840 };

/** Size the lower notch from the subtitle’s rendered width, with padding. */
export const notchFromMeasuredWidth = (
  textWidthPx: number,
  bannerWidthPx: number,
): BannerNotch => {
  if (bannerWidthPx < 8) {
    return DEFAULT_NOTCH;
  }
  const pad = Math.max(40, bannerWidthPx * 0.058);
  const minW = bannerWidthPx * 0.3;
  const maxW = bannerWidthPx * 0.92;
  const box = Math.min(maxW, Math.max(minW, Math.max(0, textWidthPx) + pad * 2));
  const notchW = (box / bannerWidthPx) * BANNER_VIEW.width;
  const minInner = BANNER_SHAPE.insetX + 10;
  const maxInner = BANNER_VIEW.width - BANNER_SHAPE.insetX - 10;
  let left = (BANNER_VIEW.width - notchW) / 2;
  let right = left + notchW;
  if (left < minInner) {
    right += minInner - left;
    left = minInner;
  }
  if (right > maxInner) {
    left -= right - maxInner;
    right = maxInner;
  }
  return { left, right };
};

export const bannerBoardRect = (scale = 1) => {
  const width = GRAPHIC_WIDTH * scale;
  const height = GRAPHIC_HEIGHT * scale;
  const headerH = Math.round(height * HEADER_RATIO);
  const x = Math.round(width * 0.045);
  const w = width - 2 * x;
  const y = (BRAND_SLOT + BANNER_MARGIN_TOP) * scale;
  const h = headerH - y - BANNER_MARGIN_BOTTOM * scale;
  return { x, y, w, h, headerH, width, height };
};

/** Banner outline thickness in SVG viewBox units (matches CSS strokeWidth). */
export const BANNER_STROKE_VB = 7;

/** Centerline of the white banner stroke in board pixels. */
export const bannerStrokeTop = (scale = 1) => {
  const { y, h } = bannerBoardRect(scale);
  return y + (BANNER_SHAPE.top / BANNER_VIEW.height) * h;
};

/** Outer (visual) top of the white title-box border. */
export const bannerStrokeOuterTop = (scale = 1) => {
  const { h } = bannerBoardRect(scale);
  const strokePx = (BANNER_STROKE_VB / BANNER_VIEW.height) * h;
  return bannerStrokeTop(scale) - strokePx / 2;
};

/**
 * Montserrat Black cap-mid in em (top sidebearing + half cap-height).
 * Used so the letters even-split the gap above the banner.
 */
export const BRAND_CAP_MID_EM = 0.43;

/**
 * CSS top of the brand em-box so the caps sit in the middle of the
 * gap between the graphic top and the title-box border.
 */
export const brandEmTop = (scale = 1) => {
  const font = BRAND_FONT * scale;
  return bannerStrokeOuterTop(scale) / 2 - font * BRAND_CAP_MID_EM;
};

/** Canvas baseline (middle) matching brandEmTop. */
export const brandBaselineY = (scale = 1) =>
  brandEmTop(scale) + (BRAND_FONT * scale) / 2;

/** Inner notch pocket between the shoulder underside and the bottom stroke. */
export const notchInnerY = (scale = 1) => {
  const { y, h } = bannerBoardRect(scale);
  const strokePx = (BANNER_STROKE_VB / BANNER_VIEW.height) * h;
  const waist = y + (BANNER_SHAPE.waist / BANNER_VIEW.height) * h;
  const bottom = y + (BANNER_SHAPE.bottom / BANNER_VIEW.height) * h;
  return {
    top: waist + strokePx / 2,
    bottom: bottom - strokePx / 2,
  };
};

/**
 * CSS top of the subtitle em-box so the caps sit in the middle of the
 * lower notch, a little above the bottom stroke.
 */
export const subEmTop = (scale = 1) => {
  const font = SUB_FONT * scale;
  const { top, bottom } = notchInnerY(scale);
  const pocketH = bottom - top;
  const capCenter = (top + bottom) / 2 - pocketH * SUB_OPTICAL_LIFT;
  return capCenter - font * BRAND_CAP_MID_EM;
};

/** Canvas baseline (middle) matching subEmTop. */
export const subBaselineY = (scale = 1) =>
  subEmTop(scale) + (SUB_FONT * scale) / 2;

export const bandCenterY = (
  bannerY: number,
  bannerH: number,
  topFrac: number,
  heightFrac: number,
) => bannerY + (topFrac + heightFrac / 2) * bannerH;

export const trackedTextWidth = (charWidths: number[], tracking: number) => {
  if (charWidths.length === 0) {
    return 0;
  }
  return (
    charWidths.reduce((sum, value) => sum + value, 0) +
    (charWidths.length - 1) * tracking
  );
};
