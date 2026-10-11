export interface OpaqueBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Alpha-weighted centroid in source-image pixels. */
  cx?: number;
  cy?: number;
}

export interface LogoRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ALPHA_CUTOFF = 16;

/** Fit the trimmed artwork inside the cell; wide marks can use cell width. */
export const LOGO_FIT_X = 0.82;
export const LOGO_FIT_Y = 0.76;
/** Nudge every mark up by this fraction of cell height (~3% above geometric center). */
export const LOGO_LIFT = 0.03;
/** Ignore left/right mass below this fraction of the trimmed width. */
export const OPTICAL_DEADZONE = 0.06;
/** How much of the centroid offset to apply (1 = full mass center). */
export const OPTICAL_GAIN = 0.8;
/** Cap horizontal optical shift as a fraction of cell width. */
export const OPTICAL_CLAMP = 0.055;

export const getOpaqueBoundsFromImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): OpaqueBounds => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let massX = 0;
  let massY = 0;
  let mass = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3] ?? 0;
      if (alpha <= ALPHA_CUTOFF) {
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      massX += x * alpha;
      massY += y * alpha;
      mass += alpha;
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: 0,
      y: 0,
      w: width,
      h: height,
      cx: width / 2,
      cy: height / 2,
    };
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
    cx: mass > 0 ? massX / mass : (minX + maxX) / 2,
    cy: mass > 0 ? massY / mass : (minY + maxY) / 2,
  };
};

export const getOpaqueBounds = (
  image: CanvasImageSource & {
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
  },
): OpaqueBounds => {
  const width = image.naturalWidth || image.width || 0;
  const height = image.naturalHeight || image.height || 0;
  if (width < 1 || height < 1) {
    return { x: 0, y: 0, w: 1, h: 1, cx: 0.5, cy: 0.5 };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return {
      x: 0,
      y: 0,
      w: width,
      h: height,
      cx: width / 2,
      cy: height / 2,
    };
  }
  context.drawImage(image, 0, 0);
  return getOpaqueBoundsFromImageData(
    context.getImageData(0, 0, width, height).data,
    width,
    height,
  );
};

const boundsCache = new Map<string, OpaqueBounds>();

export const getCachedOpaqueBounds = (
  key: string,
  image: HTMLImageElement,
): OpaqueBounds => {
  const hit = boundsCache.get(key);
  if (hit) {
    return hit;
  }
  const bounds = getOpaqueBounds(image);
  boundsCache.set(key, bounds);
  return bounds;
};

const boxCenterX = (bounds: OpaqueBounds) => bounds.x + bounds.w / 2;

/**
 * Horizontal shift (positive = right) that counters extra visual mass so the
 * mark *looks* centered. Balanced circular logos stay put.
 */
export const opticalShiftX = (
  bounds: OpaqueBounds,
  destW: number,
  cellW: number,
) => {
  if (bounds.w < 1) {
    return 0;
  }
  const cx = bounds.cx ?? boxCenterX(bounds);
  const frac = (cx - boxCenterX(bounds)) / bounds.w;
  if (Math.abs(frac) < OPTICAL_DEADZONE) {
    return 0;
  }
  const raw = destW * frac * OPTICAL_GAIN;
  const clamp = cellW * OPTICAL_CLAMP;
  return Math.max(-clamp, Math.min(clamp, raw));
};

/**
 * Place the trimmed artwork in the cell: lifted 5%, then optically shifted
 * when visual mass sits off the bounding-box center.
 */
export const fittedLogoRect = (
  bounds: OpaqueBounds,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  fitX = LOGO_FIT_X,
  fitY = LOGO_FIT_Y,
): LogoRect => {
  const maxW = cellW * fitX;
  const maxH = cellH * fitY;
  const scale = Math.min(
    maxW / Math.max(1, bounds.w),
    maxH / Math.max(1, bounds.h),
  );
  const w = bounds.w * scale;
  const h = bounds.h * scale;
  return {
    x: cellX + (cellW - w) / 2 - opticalShiftX(bounds, w, cellW),
    y: cellY + (cellH - h) / 2 - cellH * LOGO_LIFT,
    w,
    h,
  };
};

export const logoShadowPx = (cellW: number, cellH: number) =>
  Math.max(6, Math.round(Math.min(cellW, cellH) * 0.12));

const makeSilhouette = (
  image: HTMLImageElement,
  bounds: OpaqueBounds,
  destW: number,
  destH: number,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(destW));
  canvas.height = Math.max(1, Math.round(destH));
  const context = canvas.getContext("2d");
  if (!context) {
    return canvas;
  }
  context.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.w,
    bounds.h,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  context.globalCompositeOperation = "source-in";
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
};

const withCentroid = (bounds: OpaqueBounds): OpaqueBounds =>
  bounds.cx != null && bounds.cy != null
    ? bounds
    : {
        ...bounds,
        cx: bounds.x + bounds.w / 2,
        cy: bounds.y + bounds.h / 2,
      };

/**
 * Draw trimmed logo artwork, lifted and optically centered. Shadow is offset
 * from that mark so it does not shift the logo.
 */
export const drawCenteredLogo = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  options?: { fitX?: number; fitY?: number; shadow?: number; cacheKey?: string },
) => {
  const bounds = withCentroid(
    options?.cacheKey
      ? getCachedOpaqueBounds(options.cacheKey, image)
      : getOpaqueBounds(image),
  );
  const dest = fittedLogoRect(
    bounds,
    cellX,
    cellY,
    cellW,
    cellH,
    options?.fitX,
    options?.fitY,
  );
  const shadow =
    options?.shadow === undefined
      ? logoShadowPx(cellW, cellH)
      : Math.max(0, options.shadow);

  if (shadow > 0) {
    const stamp = makeSilhouette(image, bounds, dest.w, dest.h);
    context.save();
    context.globalAlpha = 0.92;
    for (let i = 2; i <= shadow; i += 2) {
      context.drawImage(stamp, dest.x + i, dest.y + i);
    }
    context.restore();
  }

  context.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.w,
    bounds.h,
    dest.x,
    dest.y,
    dest.w,
    dest.h,
  );
};
