import {
  BANNER_SHAPE,
  BANNER_VIEW,
  BRAND_FONT,
  BRAND_TRACKING_EM,
  SUB_BAND,
  TITLE_BAND,
  bandCenterY,
  bannerBoardRect,
  brandBaselineY,
  notchFromMeasuredWidth,
  trackedTextWidth,
} from "./bannerLayout";
import {
  HEADER_TEXTURE_SRC,
  drawCoveredTexture,
} from "./headerTexture";
import { drawCenteredLogo } from "./logoDraw";
import {
  EMPTY_SLOT_COLOR,
  GRAPHIC_BG,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  SLOT_COUNT,
  type RankingSlots,
} from "./rankingState";
import { getTeam } from "./teams";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const fillCellGradient = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  from: string,
  to: string,
) => {
  const gradient = context.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  context.fillStyle = gradient;
  context.fillRect(x, y, w, h);
};

const withHeaderDropShadow = (
  context: CanvasRenderingContext2D,
  scale: number,
  paint: () => void,
) => {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.78)";
  context.shadowOffsetX = Math.round(1.2 * scale);
  context.shadowOffsetY = Math.round(1.5 * scale);
  context.shadowBlur = 0;
  paint();
  context.restore();
};

const setLetterSpacing = (
  context: CanvasRenderingContext2D,
  tracking: number,
) => {
  const spaced = context as CanvasRenderingContext2D & { letterSpacing: string };
  if (typeof spaced.letterSpacing === "string") {
    spaced.letterSpacing = `${tracking}px`;
    return true;
  }
  return false;
};

const drawOutlinedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  fill: string,
  strokeWidth: number,
) => {
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.miterLimit = 2;
  const px = Math.round(x);
  const py = Math.round(y);
  if (strokeWidth > 0) {
    context.strokeStyle = "#000";
    context.lineWidth = strokeWidth;
    context.strokeText(text, px, py);
  }
  context.fillStyle = fill;
  context.fillText(text, px, py);
};

const drawLongShadowText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  length: number,
) => {
  context.font = font;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  for (let i = 2; i <= length; i += 2) {
    context.fillText(text, x + i, y + i);
  }
  context.fillStyle = "#fff";
  context.fillText(text, x, y);
};

const measureTrackedWidth = (
  context: CanvasRenderingContext2D,
  text: string,
  font: string,
  tracking: number,
) => {
  context.font = font;
  if (setLetterSpacing(context, tracking)) {
    const width = context.measureText(text).width;
    setLetterSpacing(context, 0);
    return width;
  }
  const chars = [...text];
  return trackedTextWidth(
    chars.map((char) => context.measureText(char).width),
    tracking,
  );
};

const drawTrackedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  tracking: number,
  fill: string,
  strokeWidth: number,
) => {
  context.font = font;
  context.textBaseline = "middle";
  context.lineJoin = "round";
  const py = Math.round(y);
  if (setLetterSpacing(context, tracking)) {
    context.textAlign = "center";
    if (strokeWidth > 0) {
      context.strokeStyle = "#000";
      context.lineWidth = strokeWidth;
      context.strokeText(text, Math.round(x), py);
    }
    context.fillStyle = fill;
    context.fillText(text, Math.round(x), py);
    setLetterSpacing(context, 0);
    return;
  }
  const chars = [...text];
  const widths = chars.map((char) => context.measureText(char).width);
  const total = trackedTextWidth(widths, tracking);
  let cursor = x - total / 2;
  context.textAlign = "left";
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i] ?? "";
    if (strokeWidth > 0) {
      context.strokeStyle = "#000";
      context.lineWidth = strokeWidth;
      context.strokeText(char, cursor, py);
    }
    context.fillStyle = fill;
    context.fillText(char, cursor, py);
    cursor += (widths[i] ?? 0) + tracking;
  }
};

const drawBannerPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  notchLeft: number,
  notchRight: number,
) => {
  const sx = w / BANNER_VIEW.width;
  const sy = h / BANNER_VIEW.height;
  const X = (vx: number) => x + vx * sx;
  const Y = (vy: number) => y + vy * sy;
  const right = BANNER_VIEW.width - BANNER_SHAPE.insetX;
  context.beginPath();
  context.moveTo(X(BANNER_SHAPE.insetX), Y(BANNER_SHAPE.top));
  context.lineTo(X(right), Y(BANNER_SHAPE.top));
  context.lineTo(X(right), Y(BANNER_SHAPE.waist));
  context.lineTo(X(notchRight), Y(BANNER_SHAPE.waist));
  context.lineTo(X(notchRight), Y(BANNER_SHAPE.bottom));
  context.lineTo(X(notchLeft), Y(BANNER_SHAPE.bottom));
  context.lineTo(X(notchLeft), Y(BANNER_SHAPE.waist));
  context.lineTo(X(BANNER_SHAPE.insetX), Y(BANNER_SHAPE.waist));
  context.closePath();
};

export interface StandingsRenderInput {
  brand: string;
  title: string;
  subtitle: string;
  slots: RankingSlots;
}

export const renderStandingsCanvas = async (
  input: StandingsRenderInput,
  scale = 2,
): Promise<HTMLCanvasElement> => {
  if (typeof document !== "undefined" && document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`900 ${BRAND_FONT * scale}px ${POSTER_FONT}`),
      document.fonts.load(`900 ${30 * scale}px ${POSTER_FONT}`),
      document.fonts.load(`900 ${50 * scale}px ${POSTER_FONT}`),
    ]).catch(() => undefined);
  }

  const width = GRAPHIC_WIDTH * scale;
  const height = GRAPHIC_HEIGHT * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open export canvas");
  }

  context.fillStyle = GRAPHIC_BG;
  context.fillRect(0, 0, width, height);

  const board = bannerBoardRect(scale);
  const { headerH, x: bannerX, y: bannerY, w: bannerW, h: bannerH } = board;
  const gridY = headerH;
  const gridH = height - headerH;

  const headerTexture = await loadImage(HEADER_TEXTURE_SRC);
  if (headerTexture) {
    drawCoveredTexture(context, headerTexture, 0, 0, width, headerH);
  }

  withHeaderDropShadow(context, scale, () => {
    drawTrackedText(
      context,
      input.brand.trim() || " ",
      width / 2,
      brandBaselineY(scale),
      `900 ${BRAND_FONT * scale}px ${POSTER_FONT}`,
      BRAND_TRACKING_EM * BRAND_FONT * scale,
      "#fff",
      0,
    );
  });

  const subFont = `900 ${30 * scale}px ${POSTER_FONT}`;
  const subTracking = 2.4 * scale;
  const subText = input.subtitle.trim() || " ";
  const subWidth = measureTrackedWidth(context, subText, subFont, subTracking);
  const notch = notchFromMeasuredWidth(subWidth, bannerW);

  drawBannerPath(context, bannerX, bannerY, bannerW, bannerH, notch.left, notch.right);
  context.strokeStyle = "#fff";
  context.lineWidth = 6 * scale;
  context.lineJoin = "miter";
  context.stroke();

  const titleY = bandCenterY(bannerY, bannerH, TITLE_BAND.topFrac, TITLE_BAND.heightFrac);
  const subY = bandCenterY(bannerY, bannerH, SUB_BAND.topFrac, SUB_BAND.heightFrac);

  withHeaderDropShadow(context, scale, () => {
    drawOutlinedText(
      context,
      input.title.trim() || " ",
      width / 2,
      titleY,
      `900 ${50 * scale}px ${POSTER_FONT}`,
      "#fff",
      2 * scale,
    );
    drawTrackedText(
      context,
      subText,
      width / 2,
      subY,
      subFont,
      subTracking,
      "#fff",
      2 * scale,
    );
  });

  const logos = await Promise.all(
    input.slots.map((id) => {
      const team = getTeam(id);
      return team ? loadImage(team.logoSrc) : Promise.resolve(null);
    }),
  );

  context.fillStyle = EMPTY_SLOT_COLOR;
  context.fillRect(0, gridY, width, gridH);

  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = Math.round((col * width) / 3);
    const x2 = Math.round(((col + 1) * width) / 3);
    const y = Math.round(gridY + (row * gridH) / 5);
    const y2 = Math.round(gridY + ((row + 1) * gridH) / 5);
    const cellW = x2 - x;
    const cellH = y2 - y;
    const team = getTeam(input.slots[index] ?? null);
    if (team) {
      fillCellGradient(context, x, y, cellW, cellH, team.cellFrom, team.cellTo);
    }

    const logo = logos[index];
    if (logo && team) {
      drawCenteredLogo(context, logo, x, y, cellW, cellH, {
        cacheKey: team.logoSrc,
      });
    }

    drawLongShadowText(
      context,
      String(index + 1),
      x + cellW * 0.036,
      y + cellH * 0.024,
      `900 ${48 * scale}px ${POSTER_FONT}`,
      8 * scale,
    );
  }

  return canvas;
};

export const canvasToPngBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not encode PNG"));
      }
    }, "image/png");
  });
