import {
  IDENTITY_PURPLE,
  IDENTITY_PURPLE_GLOW,
  frameColor,
  frameLinePx,
  paintCellFrameEdges,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdges,
  paintPurpleTitleGlow,
  purplePlateLinePx,
  purplePlateOutsetRect,
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
  PYR_CUTOUT_ALPHA,
  PYR_CUTOUT_BAND,
  PYR_CUTOUT_DILATE,
  PYR_DEFAULT_ROWS,
  PYR_TITLE_SIZE,
  PYR_TITLE_TRACK,
  PYR_TITLE_Y,
  opaqueSpanFromAlphas,
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
    context.globalAlpha = 0.78;
    context.globalCompositeOperation = "overlay";
    drawCoveredTexture(context, texture, x, y, w, h);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }
  const wash = context.createLinearGradient(x, y, x + w, y + h);
  wash.addColorStop(0, "rgba(176, 38, 255, 0.28)");
  wash.addColorStop(1, "rgba(106, 0, 230, 0.46)");
  context.fillStyle = wash;
  context.fillRect(x, y, w, h);
  const step = BANNER_STUD_STEP * scale;
  const size = Math.max(BANNER_STUD_SIZE * scale, 3 * scale);
  const inset = (step - size) / 2;
  context.fillStyle = PYR_CELL_STUD;
  context.globalAlpha = 0.68;
  const x0 = Math.floor(x / step) * step;
  const y0 = Math.floor(y / step) * step;
  for (let py = y0; py < y + h + step; py += step) {
    for (let px = x0; px < x + w + step; px += step) {
      context.fillRect(px + inset, py + inset, size, size);
    }
  }
  context.restore();
};

const paintGappedTopStroke = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  line: number,
  color: string,
  gap: { left: number; right: number } | null,
  glow = 0,
) => {
  if (line <= 0 || w <= 0) {
    return;
  }
  const inset = line / 2;
  const top = y + inset;
  const segments = gap
    ? [
        [x + inset, x + gap.left],
        [x + gap.right, x + w - inset],
      ]
    : [[x + inset, x + w - inset]];
  context.save();
  context.strokeStyle = color;
  context.lineWidth = line;
  context.lineCap = "butt";
  context.lineJoin = "miter";
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  if (glow > 0) {
    context.shadowColor = IDENTITY_PURPLE_GLOW;
    context.shadowBlur = glow;
  }
  for (const [from, to] of segments) {
    if (to - from < line) {
      continue;
    }
    context.beginPath();
    context.moveTo(from, top);
    context.lineTo(to, top);
    context.stroke();
  }
  context.restore();
};

const drawSlotPhoto = (
  context: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  x: number,
  drawY: number,
  w: number,
  drawH: number,
  pan: PyramidSlot["pan"],
) => {
  const dest = coverPanDraw(
    photo.naturalWidth || photo.width,
    photo.naturalHeight || photo.height,
    x,
    drawY,
    w,
    drawH,
    pan.x,
    pan.y,
    photoZoom(pan),
  );
  const rotate = photoRotate(pan);
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
    return;
  }
  context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
};

const headGapAtCellTop = (
  photo: HTMLImageElement,
  w: number,
  h: number,
  pop: number,
  pan: PyramidSlot["pan"],
  scale: number,
  bandPad: number,
): { left: number; right: number } | null => {
  const sprite = document.createElement("canvas");
  sprite.width = Math.max(1, Math.round(w));
  sprite.height = Math.max(1, Math.round(h + pop));
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) {
    return null;
  }
  drawSlotPhoto(spriteCtx, photo, 0, 0, sprite.width, sprite.height, pan);
  const dilate = Math.round(PYR_CUTOUT_DILATE * scale);
  const bandTop = Math.max(0, Math.floor(pop - bandPad));
  const bandBottom = Math.min(
    sprite.height,
    Math.ceil(pop + PYR_CUTOUT_BAND * scale),
  );
  const bandH = Math.max(1, bandBottom - bandTop);
  const pixels = spriteCtx.getImageData(0, bandTop, sprite.width, bandH).data;
  const columns = new Uint8Array(sprite.width);
  for (let row = 0; row < bandH; row += 1) {
    for (let col = 0; col < sprite.width; col += 1) {
      const alpha = pixels[(row * sprite.width + col) * 4 + 3]!;
      if (alpha > columns[col]!) {
        columns[col] = alpha;
      }
    }
  }
  return opaqueSpanFromAlphas(columns, PYR_CUTOUT_ALPHA, dilate);
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
    let photo: HTMLImageElement | null = null;
    if (slot?.photoSrc) {
      photo = slot.photoSrc.startsWith("data:")
        ? await loadImage(slot.photoSrc)
        : await loadCorsImage(slot.photoSrc);
    }
    context.save();
    context.beginPath();
    context.rect(x, drawY, w, drawH);
    context.clip();
    if (photo) {
      drawSlotPhoto(context, photo, x, drawY, w, drawH, slot.pan);
    }
    context.restore();
    const rest = filled ? FRAME_FRONT : FRAME_ALL;
    paintCellFrameEdges(context, x, y, w, h, input.look, s, rest);
    if (input.purpleFlair) {
      paintPurplePlateEdges(context, x, y, w, h, s, rest);
    }
    const line = frameLinePx(s, input.look);
    const purpleLine = input.purpleFlair ? purplePlateLinePx(s) : 0;
    const gap =
      filled && photo
        ? headGapAtCellTop(
            photo,
            w,
            h,
            pop,
            slot.pan,
            s,
            Math.max(line, purpleLine) + s,
          )
        : null;
    if (filled) {
      paintGappedTopStroke(
        context,
        x,
        y,
        w,
        line,
        frameColor(input.look),
        gap,
      );
      if (input.purpleFlair) {
        const outer = purplePlateOutsetRect(x, y, w, h, s);
        const purpleGap = gap
          ? {
              left: gap.left + (x - outer.x),
              right: gap.right + (x - outer.x),
            }
          : null;
        paintGappedTopStroke(
          context,
          outer.x,
          outer.y,
          outer.w,
          outer.line,
          IDENTITY_PURPLE,
          purpleGap,
          Math.round(8 * s),
        );
      }
    } else if (input.purpleFlair) {
      paintPurplePlateEdges(context, x, y, w, h, s, FRAME_TOP);
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
