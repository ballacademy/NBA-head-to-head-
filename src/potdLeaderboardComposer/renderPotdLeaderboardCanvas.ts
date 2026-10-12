import {
  IMPROVE_RIM_WHITE,
  isImprovedLook,
  paintImproveCellRim,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { normalizeComposerTitle } from "../instagramComposer/titleLayout";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PLB_DOT,
  PLB_GAP,
  PLB_INK,
  PLB_LIST_FILL,
  PLB_LIST_INSET,
  PLB_PAD_BOTTOM,
  PLB_PAD_TOP,
  PLB_PAD_X,
  PLB_ROW_SIZE,
  PLB_ROW_TRACK,
  PLB_STROKE,
  PLB_TITLE_H,
  PLB_TITLE_SIZE,
  PLB_TITLE_TRACK,
  PLB_YELLOW,
} from "./potdLeaderboardLayout";
import {
  DEFAULT_POTD_LEADERBOARD_TITLE,
  rankLeaderboard,
  type LeaderboardEntry,
} from "./potdLeaderboardState";

export { canvasToPngBlob };

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

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

const strokeFillText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
) => {
  context.lineJoin = "round";
  context.miterLimit = 2;
  if (strokeWidth > 0) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.strokeText(text, x, y);
  }
  context.fillStyle = fill;
  context.fillText(text, x, y);
};

const paintDottedFill = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) => {
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.fillStyle = PLB_LIST_FILL;
  context.fillRect(x, y, w, h);
  const step = 5 * scale;
  const dot = Math.max(1, 1.1 * scale);
  context.fillStyle = PLB_DOT;
  for (let py = y; py < y + h; py += step) {
    for (let px = x; px < x + w; px += step) {
      context.fillRect(px, py, dot, dot);
    }
  }
  context.restore();
};

export interface PotdLeaderboardRenderInput {
  title: string;
  entries: LeaderboardEntry[];
  look?: ComposerLook;
  showBa?: boolean;
}

export const renderPotdLeaderboardCanvas = async (
  input: PotdLeaderboardRenderInput,
  scale = 2,
) => {
  const width = GRAPHIC_WIDTH * scale;
  const height = GRAPHIC_HEIGHT * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open canvas");
  }

  await document.fonts?.ready.catch(() => undefined);
  await document.fonts
    ?.load(`900 ${PLB_TITLE_SIZE * scale}px ${POSTER_FONT}`)
    .catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);

  const s = scale;
  const titleX = PLB_PAD_X * s;
  const titleY = PLB_PAD_TOP * s;
  const titleW = width - titleX * 2;
  const titleH = PLB_TITLE_H * s;
  const listY = titleY + titleH + PLB_GAP * s;
  const listX = titleX;
  const listW = titleW;
  const listH = height - listY - PLB_PAD_BOTTOM * s;
  const stroke = PLB_STROKE * s;

  context.fillStyle = PLB_INK;
  context.fillRect(titleX, titleY, titleW, titleH);
  context.strokeStyle = PLB_YELLOW;
  context.lineWidth = stroke;
  context.strokeRect(
    titleX + stroke / 2,
    titleY + stroke / 2,
    titleW - stroke,
    titleH - stroke,
  );

  const title = normalizeComposerTitle(
    input.title,
    DEFAULT_POTD_LEADERBOARD_TITLE,
  );
  context.font = `900 ${PLB_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, PLB_TITLE_TRACK * PLB_TITLE_SIZE * s);
  strokeFillText(
    context,
    title,
    titleX + titleW / 2,
    titleY + titleH / 2,
    PLB_YELLOW,
    PLB_INK,
    5 * s,
  );
  setLetterSpacing(context, 0);

  paintDottedFill(context, listX, listY, listW, listH, s);
  context.strokeStyle = PLB_YELLOW;
  context.lineWidth = stroke;
  context.strokeRect(
    listX + stroke / 2,
    listY + stroke / 2,
    listW - stroke,
    listH - stroke,
  );

  if (isImprovedLook(input.look)) {
    paintImproveCellRim(context, titleX, titleY, titleW, titleH, IMPROVE_RIM_WHITE);
    paintImproveCellRim(context, listX, listY, listW, listH, IMPROVE_RIM_WHITE);
  }

  const ranked = rankLeaderboard(input.entries);
  const inset = PLB_LIST_INSET * s;
  const innerX = listX + inset;
  const innerW = listW - inset * 2;
  const innerY = listY + 18 * s;
  const innerH = listH - 32 * s;
  const rowH =
    ranked.length > 0
      ? Math.min(52 * s, innerH / ranked.length)
      : 52 * s;

  context.font = `900 ${PLB_ROW_SIZE * s}px ${POSTER_FONT}`;
  context.textBaseline = "middle";
  setLetterSpacing(context, PLB_ROW_TRACK * PLB_ROW_SIZE * s);
  context.fillStyle = PLB_YELLOW;

  ranked.forEach((entry, index) => {
    const y = innerY + index * rowH + rowH / 2;
    context.textAlign = "left";
    context.fillText(entry.rankLabel, innerX, y);
    context.textAlign = "center";
    context.fillText(
      entry.displayName,
      innerX + innerW / 2,
      y,
    );
    context.textAlign = "right";
    context.fillText(entry.winsLabel, innerX + innerW, y);
  });
  setLetterSpacing(context, 0);

  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 72 * s;
      const inset = 42 * s;
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
