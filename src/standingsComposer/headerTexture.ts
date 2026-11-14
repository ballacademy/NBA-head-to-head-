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

/** Charcoal floor under Shot/Plot data — not the stacked metal slats. */
export const CHARCOAL_FLOOR = BANNER_FILL_BASE;
export const COURT_FLOOR = "#121212";
export const PLOT_HAIRLINE = "rgba(255, 255, 255, 0.08)";
export const PLOT_HAIRLINE_STEP = 40;

/** Title-box studs as a CSS tile — same 10u grid as `drawBannerInterior`. */
export const BANNER_STUD_CSS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='%231c1c1c'/%3E%3Crect x='3.75' y='3.75' width='2.5' height='2.5' fill='%232a2a2a'/%3E%3C/svg%3E")`;

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

/** Fill a rect with title-box charcoal + faint square studs. */
export const paintStuddedCharcoal = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) => {
  drawBannerInterior(context, x, y, w, h, scale, () => {
    context.beginPath();
    context.rect(x, y, w, h);
  });
};

/** Stacked metal in the header only; charcoal + studs on the rest of the board. */
export const paintHeaderMetalField = (
  context: CanvasRenderingContext2D,
  image: Parameters<typeof paintBoardField>[1],
  width: number,
  height: number,
  headerH: number,
  scale: number,
) => {
  paintBoardField(context, image, width, height);
  if (headerH < height) {
    paintStuddedCharcoal(context, 0, headerH, width, height - headerH, scale);
  }
};

/** Plot floor: charcoal board, faint hairline grid inside the plot rect. */
export const paintCharcoalHairlineFloor = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  plot: { x: number; y: number; w: number; h: number },
  scale: number,
) => {
  context.fillStyle = CHARCOAL_FLOOR;
  context.fillRect(0, 0, width, height);
  if (plot.w < 1 || plot.h < 1) {
    return;
  }
  context.save();
  context.beginPath();
  context.rect(plot.x, plot.y, plot.w, plot.h);
  context.clip();
  context.strokeStyle = PLOT_HAIRLINE;
  context.lineWidth = Math.max(1, 0.7 * scale);
  const step = PLOT_HAIRLINE_STEP * scale;
  const xEnd = plot.x + plot.w;
  const yEnd = plot.y + plot.h;
  for (let x = plot.x; x <= xEnd + 0.5; x += step) {
    context.beginPath();
    context.moveTo(x, plot.y);
    context.lineTo(x, yEnd);
    context.stroke();
  }
  for (let y = plot.y; y <= yEnd + 0.5; y += step) {
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(xEnd, y);
    context.stroke();
  }
  context.restore();
};
