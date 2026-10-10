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

/** Top of the white banner stroke in board pixels. */
export const bannerStrokeTop = (scale = 1) => {
  const { y, h } = bannerBoardRect(scale);
  return y + (BANNER_SHAPE.top / BANNER_VIEW.height) * h;
};

/**
 * CSS top of the brand em-box so the cap-height sits in the middle of the
 * gap between the graphic top and the banner stroke.
 */
export const brandEmTop = (scale = 1) => {
  const font = BRAND_FONT * scale;
  return bannerStrokeTop(scale) / 2 - font * 0.36;
};

/** Canvas baseline (middle) matching brandEmTop. */
export const brandBaselineY = (scale = 1) =>
  brandEmTop(scale) + (BRAND_FONT * scale) / 2;

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
