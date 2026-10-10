export const HEADER_TEXTURE_SRC = "/standings-header-texture.png";

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
