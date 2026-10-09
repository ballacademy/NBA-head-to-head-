import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "./rankingState";

/** Fraction of the 4:5 board given to the header (brand + banner). */
export const HEADER_RATIO = 0.17866;

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
  const y = (32 + 24 + 16) * scale;
  const h = headerH - y - 26 * scale;
  return { x, y, w, h, headerH, width, height };
};

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
