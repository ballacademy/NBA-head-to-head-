export interface OpaqueBounds {
  x: number;
  y: number;
  w: number;
  h: number;
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

export const getOpaqueBoundsFromImageData = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
): OpaqueBounds => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

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
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, w: width, h: height };
  }

  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
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
    return { x: 0, y: 0, w: 1, h: 1 };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { x: 0, y: 0, w: width, h: height };
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

/**
 * Place the trimmed artwork so its bounding-box center sits on the cell
 * center. No extra translate — shadow is drawn separately around this rect.
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
    x: cellX + (cellW - w) / 2,
    y: cellY + (cellH - h) / 2,
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

/**
 * Draw trimmed logo artwork at the true center of a cell. Shadow is offset
 * from that centered mark so it does not shift the logo.
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
  const bounds = options?.cacheKey
    ? getCachedOpaqueBounds(options.cacheKey, image)
    : getOpaqueBounds(image);
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
