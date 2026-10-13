import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
  paintPurpleTitleGlow,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PYR_BA_INSET,
  PYR_BA_SIZE,
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
    context.save();
    context.beginPath();
    context.rect(x, drawY, w, drawH);
    context.clip();
    context.fillStyle = "#111";
    context.fillRect(x, y, w, h);
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
    paintCellFrame(context, x, y, w, h, input.look, s);
    if (input.purpleFlair) {
      paintPurplePlateEdge(context, x, y, w, h, s);
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
