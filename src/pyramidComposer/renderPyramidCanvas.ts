import {
  paintCellFrameEdges,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdges,
  paintPurpleTitleGlow,
  type ComposerLook,
  type FrameEdge,
} from "../instagramComposer/composerLook";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  BANNER_STUD_SIZE,
  BANNER_STUD_STEP,
  FIELD_TEXTURE_SRC,
  drawCoveredTexture,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PYR_BA_INSET,
  PYR_BA_SIZE,
  PYR_CELL_FILL,
  PYR_CELL_STUD,
  PYR_DEFAULT_ROWS,
  PYR_TITLE_SIZE,
  PYR_TITLE_TRACK,
  PYR_TITLE_Y,
  pyramidCellRect,
  pyramidSlotCount,
} from "./pyramidLayout";
import { pyramidTitle, type PyramidSlot } from "./pyramidState";

export { canvasToPngBlob };

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";
const FRAME_TOP: FrameEdge[] = ["top"];
const FRAME_FRONT: FrameEdge[] = ["right", "bottom", "left"];
const FRAME_ALL: FrameEdge[] = ["top", "right", "bottom", "left"];

const paintPyramidCellFill = (
  context: CanvasRenderingContext2D,
  texture: HTMLImageElement | null,
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
  context.fillStyle = PYR_CELL_FILL;
  context.fillRect(x, y, w, h);
  if (texture) {
    context.globalAlpha = 0.62;
    context.globalCompositeOperation = "overlay";
    drawCoveredTexture(context, texture, x, y, w, h);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }
  const wash = context.createLinearGradient(x, y, x + w, y + h);
  wash.addColorStop(0, "rgba(176, 38, 255, 0.22)");
  wash.addColorStop(1, "rgba(106, 0, 230, 0.38)");
  context.fillStyle = wash;
  context.fillRect(x, y, w, h);
  const step = BANNER_STUD_STEP * scale;
  const size = BANNER_STUD_SIZE * scale;
  const inset = (step - size) / 2;
  context.fillStyle = PYR_CELL_STUD;
  context.globalAlpha = 0.5;
  const x0 = Math.floor(x / step) * step;
  const y0 = Math.floor(y / step) * step;
  for (let py = y0; py < y + h + step; py += step) {
    for (let px = x0; px < x + w + step; px += step) {
      context.fillRect(px + inset, py + inset, size, size);
    }
  }
  context.restore();
};

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

const withShadow = (
  context: CanvasRenderingContext2D,
  scale: number,
  paint: () => void,
) => {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.82)";
  context.shadowOffsetX = Math.round(1.2 * scale);
  context.shadowOffsetY = Math.round(1.5 * scale);
  context.shadowBlur = 0;
  paint();
  context.restore();
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
  context.strokeStyle = stroke;
  context.lineWidth = strokeWidth;
  context.strokeText(text, x, y);
  context.fillStyle = fill;
  context.fillText(text, x, y);
};

export interface PyramidRenderInput {
  title: string;
  slots: PyramidSlot[];
  rows?: number;
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
}

export const renderPyramidCanvas = async (
  input: PyramidRenderInput,
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
    ?.load(`900 ${PYR_TITLE_SIZE * scale}px ${POSTER_FONT}`)
    .catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);
  const s = scale;
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const title = pyramidTitle(input.title);
  context.font = `900 ${PYR_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, PYR_TITLE_TRACK * PYR_TITLE_SIZE * s);
  const paintTitle = () => {
    withShadow(context, s, () => {
      strokeFillText(
        context,
        title,
        width / 2,
        (PYR_TITLE_Y + 46) * s,
        "#fff",
        "#000",
        3.2 * s,
      );
    });
  };
  if (input.purpleFlair) {
    paintPurpleTitleGlow(context, s, paintTitle);
  } else {
    paintTitle();
  }
  setLetterSpacing(context, 0);

  const rowCount = input.rows ?? PYR_DEFAULT_ROWS;
  const slotCount = Math.min(input.slots.length, pyramidSlotCount(rowCount));
  for (let index = slotCount - 1; index >= 0; index -= 1) {
    const slot = input.slots[index]!;
    const rect = pyramidCellRect(index, rowCount);
    const x = rect.x * s;
    const y = rect.y * s;
    const w = rect.w * s;
    const h = rect.h * s;
    const pop = rect.pop * s;
    const drawY = y - pop;
    const drawH = h + pop;
    const filled = Boolean(slot?.photoSrc);
    paintPyramidCellFill(context, fieldTexture, x, y, w, h, s);
    if (filled) {
      paintCellFrameEdges(context, x, y, w, h, input.look, s, FRAME_TOP);
      if (input.purpleFlair) {
        paintPurplePlateEdges(context, x, y, w, h, s, FRAME_TOP);
      }
    }
    context.save();
    context.beginPath();
    context.rect(x, drawY, w, drawH);
    context.clip();
    if (slot?.photoSrc) {
      const photo = slot.photoSrc.startsWith("data:")
        ? await loadImage(slot.photoSrc)
        : await loadCorsImage(slot.photoSrc);
      if (photo) {
        const dest = coverPanDraw(
          photo.naturalWidth || photo.width,
          photo.naturalHeight || photo.height,
          x,
          drawY,
          w,
          drawH,
          slot.pan.x,
          slot.pan.y,
          photoZoom(slot.pan),
        );
        const rotate = photoRotate(slot.pan);
        if (rotate) {
          context.save();
          context.translate(x + w / 2, drawY + drawH / 2);
          context.rotate((rotate * Math.PI) / 180);
          context.drawImage(
            photo,
            dest.dx - (x + w / 2),
            dest.dy - (drawY + drawH / 2),
            dest.dw,
            dest.dh,
          );
          context.restore();
        } else {
          context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
        }
      }
    }
    context.restore();
    const rest = filled ? FRAME_FRONT : FRAME_ALL;
    paintCellFrameEdges(context, x, y, w, h, input.look, s, rest);
    if (input.purpleFlair) {
      paintPurplePlateEdges(context, x, y, w, h, s, rest);
    }
  }

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = PYR_BA_SIZE * s;
      const inset = PYR_BA_INSET * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
