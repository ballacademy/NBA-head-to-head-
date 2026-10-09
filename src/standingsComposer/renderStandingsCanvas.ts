import {
  EMPTY_SLOT_COLOR,
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
  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  for (let i = 2; i <= length; i += 2) {
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
  const chars = [...text];
  const widths = chars.map((char) => context.measureText(char).width);
  const total =
    widths.reduce((sum, value) => sum + value, 0) +
    Math.max(0, chars.length - 1) * tracking;
  let cursor = x - total / 2;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i] ?? "";
    if (strokeWidth > 0) {
      context.strokeStyle = "#000";
      context.lineWidth = strokeWidth;
      context.strokeText(char, cursor, y);
    }
    context.fillStyle = fill;
    context.fillText(char, cursor, y);
    cursor += (widths[i] ?? 0) + tracking;
  }
};

const bannerPath = (context: CanvasRenderingContext2D, s: number) => {
  context.beginPath();
  context.moveTo(54 * s, 83 * s);
  context.lineTo(1145 * s, 83 * s);
  context.lineTo(1145 * s, 187 * s);
  context.lineTo(849 * s, 187 * s);
  context.lineTo(849 * s, 240 * s);
  context.lineTo(349 * s, 240 * s);
  context.lineTo(349 * s, 187 * s);
  context.lineTo(54 * s, 187 * s);
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
      document.fonts.load(`900 26px ${POSTER_FONT}`),
      document.fonts.load(`900 58px ${POSTER_FONT}`),
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

  drawTrackedText(
    context,
    input.brand.trim() || " ",
    width / 2,
    42 * scale,
    `900 ${24 * scale}px ${POSTER_FONT}`,
    6.2 * scale,
    "#fff",
    0,
  );

  bannerPath(context, scale);
  context.fillStyle = "#050505";
  context.fill();
  context.strokeStyle = "#fff";
  context.lineWidth = 6 * scale;
  context.lineJoin = "miter";
  context.stroke();

  drawOutlinedText(
    context,
    input.title.trim() || " ",
    width / 2,
    132 * scale,
    `900 ${52 * scale}px ${POSTER_FONT}`,
    "#fff",
    6 * scale,
  );
  drawTrackedText(
    context,
    input.subtitle.trim() || " ",
    width / 2,
    214 * scale,
    `900 ${32 * scale}px ${POSTER_FONT}`,
    4.2 * scale,
    "#fff",
    4.2 * scale,
  );

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
    if (logo) {
      const size = cellW * 0.68;
      drawLogoWithShadow(
        context,
        logo,
        x + (cellW - size) / 2 + cellW * 0.02,
        y + (cellH - size) / 2 + cellH * 0.05,
        size,
        30 * scale,
      );
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
