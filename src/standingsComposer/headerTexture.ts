export const HEADER_TEXTURE_SRC = "/standings-header-texture.png";

/** Inside the title box: same grain, shifted and slightly darkened. */
export const BANNER_FILL_OVERLAY = "rgba(0, 0, 0, 0.22)";
export const BANNER_FILL_SHIFT = { x: 0.16, y: 0.26 } as const;

export interface CoverRect {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** object-fit: cover placement of an image into a destination rect. */
export const coverRect = (
  imageW: number,
  imageH: number,
  x: number,
  y: number,
  w: number,
  h: number,
): CoverRect => {
  const scale = Math.max(w / Math.max(1, imageW), h / Math.max(1, imageH));
  const dw = imageW * scale;
  const dh = imageH * scale;
  return {
    dx: x + (w - dw) / 2,
    dy: y + (h - dh) / 2,
    dw,
    dh,
  };
};

export const drawCoveredTexture = (
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number },
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const iw = image.naturalWidth || image.width || 0;
  const ih = image.naturalHeight || image.height || 0;
  if (iw < 1 || ih < 1 || w < 1 || h < 1) {
    return;
  }
  const { dx, dy, dw, dh } = coverRect(iw, ih, x, y, w, h);
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.drawImage(image, dx, dy, dw, dh);
  context.restore();
};

/** Cover the dest rect with an offset sample so the grain does not match the header field. */
export const bannerFillImageRect = (x: number, y: number, w: number, h: number) => {
  const ox = w * BANNER_FILL_SHIFT.x;
  const oy = h * BANNER_FILL_SHIFT.y;
  return { x: x - ox, y: y - oy, w: w + ox * 2, h: h + oy * 2 };
};

export const drawBannerInterior = (
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & {
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
  },
  x: number,
  y: number,
  w: number,
  h: number,
  buildPath: () => void,
) => {
  context.save();
  buildPath();
  context.clip();
  const placed = bannerFillImageRect(x, y, w, h);
  drawCoveredTexture(context, image, placed.x, placed.y, placed.w, placed.h);
  context.fillStyle = BANNER_FILL_OVERLAY;
  buildPath();
  context.fill();
  context.restore();
};
