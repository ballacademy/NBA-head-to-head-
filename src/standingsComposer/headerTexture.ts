export const HEADER_TEXTURE_SRC = "/standings-header-texture.png";

/** Title-box interior — near-black, not the brushed header metal. */
export const BANNER_FILL_BASE = "#111111";
export const BANNER_STUD_FILL = "#1c1c1c";
/** Board-unit grid for the subtle square studs. */
export const BANNER_STUD_STEP = 10;
export const BANNER_STUD_SIZE = 2.5;

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

export const bannerStudMetrics = (scale = 1) => {
  const step = BANNER_STUD_STEP * scale;
  const size = BANNER_STUD_SIZE * scale;
  return { step, size, inset: (step - size) / 2 };
};

/** Near-black field with a faint square-stud grid, clipped to the title box. */
export const drawBannerInterior = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  buildPath: () => void,
) => {
  context.save();
  buildPath();
  context.clip();
  context.fillStyle = BANNER_FILL_BASE;
  context.fillRect(x, y, w, h);
  const { step, size, inset } = bannerStudMetrics(scale);
  context.fillStyle = BANNER_STUD_FILL;
  const x0 = Math.floor(x / step) * step;
  const y0 = Math.floor(y / step) * step;
  for (let py = y0; py < y + h + step; py += step) {
    for (let px = x0; px < x + w + step; px += step) {
      context.fillRect(px + inset, py + inset, size, size);
    }
  }
  context.restore();
};
