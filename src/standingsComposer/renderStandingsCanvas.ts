import {
  EMPTY_SLOT_COLOR,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  SLOT_COUNT,
  type RankingSlots,
} from "./rankingState";
import { getTeam } from "./teams";

const FONT = '700 16px Oswald, "Arial Narrow", Impact, sans-serif';

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
  if (strokeWidth > 0) {
    context.strokeStyle = "#000";
    context.lineWidth = strokeWidth;
    context.strokeText(text, x, y);
  }
  context.fillStyle = fill;
  context.fillText(text, x, y);
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
  context.fillStyle = "#000";
  for (let i = 1; i <= length; i += 1) {
    context.fillText(text, x + i, y + i);
  }
  context.fillStyle = "#fff";
  context.fillText(text, x, y);
};

const drawLogoWithShadow = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  shadow: number,
) => {
  const silhouette = document.createElement("canvas");
  silhouette.width = size;
  silhouette.height = size;
  const stamp = silhouette.getContext("2d");
  if (!stamp) {
    context.drawImage(image, x, y, size, size);
    return;
  }
  stamp.drawImage(image, 0, 0, size, size);
  stamp.globalCompositeOperation = "source-in";
  stamp.fillStyle = "#000";
  stamp.fillRect(0, 0, size, size);
  for (let i = 2; i <= shadow; i += 2) {
    context.drawImage(silhouette, x + i, y + i);
  }
  context.drawImage(image, x, y, size, size);
};

const bannerPath = (context: CanvasRenderingContext2D, scale: number) => {
  const x = 18 * scale;
  const top = 8 * scale;
  const right = 1182 * scale;
  const bodyBottom = 118 * scale;
  const tabLeft = 355 * scale;
  const tabRight = 845 * scale;
  const tabBottom = 192 * scale;
  context.beginPath();
  context.moveTo(x, top);
  context.lineTo(right, top);
  context.lineTo(right, bodyBottom);
  context.lineTo(tabRight, bodyBottom);
  context.lineTo(tabRight, tabBottom);
  context.lineTo(tabLeft, tabBottom);
  context.lineTo(tabLeft, bodyBottom);
  context.lineTo(x, bodyBottom);
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
      document.fonts.load(`700 26px Oswald`),
      document.fonts.load(FONT),
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

  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);

  const headerH = Math.round(height * 0.17866);
  const gridY = headerH;
  const gridH = height - headerH;
  const cellW = width / 3;
  const cellH = gridH / 5;

  drawOutlinedText(
    context,
    input.brand.trim() || " ",
    width / 2,
    40 * scale,
    `700 ${26.4 * scale}px Oswald, "Arial Narrow", Impact, sans-serif`,
    "#fff",
    0,
  );

  context.save();
  context.translate(width * 0.045, 56 * scale);
  const bannerScale = (width * 0.91) / 1200;
  context.scale(bannerScale, bannerScale * 1.12);
  bannerPath(context, 1);
  context.fillStyle = "#050505";
  context.fill();
  context.strokeStyle = "#fff";
  context.lineWidth = 7;
  context.lineJoin = "miter";
  context.stroke();
  context.restore();

  drawOutlinedText(
    context,
    input.title.trim() || " ",
    width / 2,
    118 * scale,
    `700 ${61.8 * scale}px Oswald, "Arial Narrow", Impact, sans-serif`,
    "#fff",
    6.8 * scale,
  );
  drawOutlinedText(
    context,
    input.subtitle.trim() || " ",
    width / 2,
    198 * scale,
    `700 ${36.6 * scale}px Oswald, "Arial Narrow", Impact, sans-serif`,
    "#fff",
    4.4 * scale,
  );

  const logos = await Promise.all(
    input.slots.map((id) => {
      const team = getTeam(id);
      return team ? loadImage(team.logoSrc) : Promise.resolve(null);
    }),
  );

  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = col * cellW;
    const y = gridY + row * cellH;
    const team = getTeam(input.slots[index] ?? null);
    if (team) {
      fillCellGradient(context, x, y, cellW, cellH, team.cellFrom, team.cellTo);
    } else {
      context.fillStyle = EMPTY_SLOT_COLOR;
      context.fillRect(x, y, cellW, cellH);
    }

    const logo = logos[index];
    if (logo) {
      const size = cellW * 0.72;
      drawLogoWithShadow(
        context,
        logo,
        x + (cellW - size) / 2,
        y + (cellH - size) / 2,
        size,
        30 * scale,
      );
    }

    drawLongShadowText(
      context,
      String(index + 1),
      x + cellW * 0.034,
      y + cellH * 0.021,
      `700 ${52 * scale}px Oswald, "Arial Narrow", Impact, sans-serif`,
      28 * scale,
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
