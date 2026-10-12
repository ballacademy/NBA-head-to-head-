/** Stacked dark metal — true 4:5 board field (and header chrome outside the title box). */
export const FIELD_TEXTURE_SRC = "/composer-background-texture.png";
export const HEADER_TEXTURE_SRC = FIELD_TEXTURE_SRC;

/** Title-box interior — lifted near-black, not the stacked field metal. */
export const BANNER_FILL_BASE = "#1c1c1c";
export const BANNER_STUD_FILL = "#2a2a2a";
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

/** Fill the 4:5 board with the stacked metal, cover-fit so it never stretches. */
export const paintBoardField = (
  context: CanvasRenderingContext2D,
  image:
    | (CanvasImageSource & {
        width?: number;
        height?: number;
        naturalWidth?: number;
        naturalHeight?: number;
      })
    | null,
  width: number,
  height: number,
  fallback = "#0b0b0b",
) => {
  context.fillStyle = fallback;
  context.fillRect(0, 0, width, height);
  if (image) {
    drawCoveredTexture(context, image, 0, 0, width, height);
  }
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
