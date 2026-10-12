import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export const downloadCanvasPng = async (
  canvas: HTMLCanvasElement,
  filename: string,
) => {
  const blob = await canvasToPngBlob(canvas);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.download = filename;
    link.href = objectUrl;
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }
};

/** Place a 4:5 board onto a 9:16 story canvas with the same metal field. */
export const toStoryCanvas = async (board: HTMLCanvasElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open story canvas");
  }
  const field = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, field, STORY_WIDTH, STORY_HEIGHT);
  const width = STORY_WIDTH;
  const height = Math.round((width * 5) / 4);
  const y = Math.round((STORY_HEIGHT - height) / 2);
  context.drawImage(board, 0, y, width, height);
  return canvas;
};
