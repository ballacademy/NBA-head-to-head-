import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import {
  composerShowsStamp,
  paintComposerStamp,
  readComposerStamp,
} from "./composerStamp";
import {
  getComposerExportContext,
  recordComposerRecentFromExport,
} from "./composerRecents";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export const SQUARE_SIZE = 1080;

export const squareFilename = (filename: string) =>
  filename.replace(/\.png$/i, "") + "-square.png";

export const downloadPngMaybeSquare = async (
  canvas: HTMLCanvasElement,
  filename: string,
  square = false,
) => {
  if (square) {
    await downloadCanvasPng(
      await toSquareCanvas(canvas),
      squareFilename(filename),
    );
    return;
  }
  await downloadCanvasPng(canvas, filename);
};

export const downloadCanvasPng = async (
  canvas: HTMLCanvasElement,
  filename: string,
) => {
  const mode = getComposerExportContext();
  const stamp = readComposerStamp();
  let output = canvas;
  if (mode && composerShowsStamp(mode) && stamp.on) {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    if (context) {
      context.drawImage(canvas, 0, 0);
      paintComposerStamp(context, copy.width, copy.height, stamp);
      output = copy;
    }
  }
  const blob = await canvasToPngBlob(output);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.download = filename;
    link.href = objectUrl;
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }
  recordComposerRecentFromExport(filename);
};

export const STORY_SAFE_INSET = 56;

export const storyBoardRect = (safe = false) => {
  const inset = safe ? STORY_SAFE_INSET : 0;
  const maxW = STORY_WIDTH - inset * 2;
  const maxH = STORY_HEIGHT - inset * 2;
  let width = maxW;
  let height = Math.round((width * 5) / 4);
  if (height > maxH) {
    height = maxH;
    width = Math.round((height * 4) / 5);
  }
  return {
    x: Math.round((STORY_WIDTH - width) / 2),
    y: Math.round((STORY_HEIGHT - height) / 2),
    width,
    height,
  };
};

/** Place a 4:5 board onto a 9:16 story canvas with the same metal field. */
export const toStoryCanvas = async (
  board: HTMLCanvasElement,
  options: { safe?: boolean } = {},
) => {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open story canvas");
  }
  const field = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, field, STORY_WIDTH, STORY_HEIGHT);
  const rect = storyBoardRect(options.safe === true);
  context.drawImage(board, rect.x, rect.y, rect.width, rect.height);
  return canvas;
};

/** Letterbox a 4:5 (or 9:16) board onto a 1:1 metal square. */
export const toSquareCanvas = async (board: HTMLCanvasElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = SQUARE_SIZE;
  canvas.height = SQUARE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open square canvas");
  }
  const field = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, field, SQUARE_SIZE, SQUARE_SIZE);
  const fit = Math.min(SQUARE_SIZE / board.width, SQUARE_SIZE / board.height);
  const width = board.width * fit;
  const height = board.height * fit;
  context.drawImage(
    board,
    (SQUARE_SIZE - width) / 2,
    (SQUARE_SIZE - height) / 2,
    width,
    height,
  );
  return canvas;
};
