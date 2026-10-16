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
import {
  applyPhotoGrade,
  canvasGradeFilter,
} from "../instagramComposer/photoGrade";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  BANNER_STUD_STEP,
  FIELD_TEXTURE_SRC,
  drawCoveredTexture,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { STORY_DESIGN_HEIGHT } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
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
  PYR_POP_RIM,
  PYR_POP_RIM_GLOW,
  PYR_QUIET_FRAME,
  PYR_TITLE_SIZE,
  PYR_TITLE_TRACK,
  PYR_TITLE_Y,
  opaqueSpanFromAlphas,
  pyramidCellRect,
  pyramidSlotCount,
} from "./pyramidLayout";
import { pyramidSlotPops, pyramidTitle, type PyramidSlot } from "./pyramidState";

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
  purpleFlair: boolean,
  teamFrom?: string | null,
  teamTo?: string | null,
) => {
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  if (!purpleFlair) {
    if (teamFrom && teamTo) {
      const fill = context.createLinearGradient(x, y, x + w, y + h);
      fill.addColorStop(0, teamFrom);
      fill.addColorStop(1, teamTo);
      context.fillStyle = fill;
    } else {
      context.fillStyle = "#161616";
    }
    context.fillRect(x, y, w, h);
    if (texture) {
      context.globalAlpha = teamFrom ? 0.38 : 1;
      context.globalCompositeOperation = teamFrom ? "overlay" : "source-over";
      drawCoveredTexture(context, texture, x, y, w, h);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
    }
    context.restore();
    return;
  }
  context.fillStyle = PYR_CELL_FILL;
  context.fillRect(x, y, w, h);
  const blade = context.createLinearGradient(x, y, x + w, y + h);
  blade.addColorStop(0, "rgba(255, 255, 255, 0.4)");
  blade.addColorStop(0.16, "rgba(232, 200, 255, 0.32)");
  blade.addColorStop(0.42, "rgba(176, 38, 255, 0.55)");
  blade.addColorStop(0.7, "rgba(106, 0, 230, 0.88)");
  blade.addColorStop(1, "rgba(36, 0, 96, 1)");
  context.fillStyle = blade;
  context.fillRect(x, y, w, h);
  if (texture) {
    context.globalAlpha = 0.42;
    context.globalCompositeOperation = "overlay";
    drawCoveredTexture(context, texture, x, y, w, h);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }
  const sheen = context.createLinearGradient(x, y, x, y + h * 0.55);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  sheen.addColorStop(0.45, "rgba(176, 38, 255, 0.06)");
  sheen.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = sheen;
  context.fillRect(x, y, w, h);
  const step = BANNER_STUD_STEP * scale;
  const size = Math.max(1.6 * scale, 2);
  const inset = (step - size) / 2;
  context.fillStyle = PYR_CELL_STUD;
  context.globalAlpha = 0.32;
  const x0 = Math.floor(x / step) * step;
  const y0 = Math.floor(y / step) * step;
  for (let py = y0; py < y + h + step; py += step) {
    for (let px = x0; px < x + w + step; px += step) {
      context.beginPath();
      context.arc(px + inset + size / 2, py + inset + size / 2, size / 2, 0, Math.PI * 2);
      context.fill();
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
  photoGrade = false,
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
  context.save();
  context.filter = canvasGradeFilter(photoGrade);
  if (rotate) {
    context.translate(x + w / 2, drawY + drawH / 2);
    context.rotate((rotate * Math.PI) / 180);
    context.drawImage(
      photo,
      dest.dx - (x + w / 2),
      dest.dy - (drawY + drawH / 2),
      dest.dw,
      dest.dh,
    );
  } else {
    context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
  }
  context.restore();
  applyPhotoGrade(context, x, drawY, w, drawH, photoGrade);
};

const makeSlotSprite = (
  photo: HTMLImageElement,
  w: number,
  h: number,
  pop: number,
  pan: PyramidSlot["pan"],
  photoGrade = false,
) => {
  const sprite = document.createElement("canvas");
  sprite.width = Math.max(1, Math.round(w));
  sprite.height = Math.max(1, Math.round(h + pop));
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) {
    return null;
  }
  drawSlotPhoto(
    spriteCtx,
    photo,
    0,
    0,
    sprite.width,
    sprite.height,
    pan,
    photoGrade,
  );
  return sprite;
};

const headGapAtCellTop = (
  sprite: HTMLCanvasElement,
  pop: number,
  scale: number,
  bandPad: number,
): { left: number; right: number } | null => {
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) {
    return null;
  }
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

const paintPopHeadRim = (
  context: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  drawY: number,
  pop: number,
  scale: number,
) => {
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  if (!spriteCtx) {
    return;
  }
  const width = sprite.width;
  const popRow = Math.max(1, Math.round(pop));
  const glow = Math.max(3, Math.round(PYR_POP_RIM_GLOW * scale));
  const tight = Math.max(2, Math.round(PYR_POP_RIM * scale));
  const readH = Math.min(sprite.height, popRow + glow + 2);
  const src = spriteCtx.getImageData(0, 0, width, readH).data;
  const out = spriteCtx.createImageData(width, readH);
  const dst = out.data;
  const opaque = (cx: number, cy: number) => {
    if (cx < 0 || cy < 0 || cx >= width || cy >= readH) {
      return false;
    }
    return src[(cy * width + cx) * 4 + 3]! > PYR_CUTOUT_ALPHA;
  };
  const stamp = (
    radius: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
  ) => {
    const r2 = radius * radius;
    for (let row = 0; row < popRow; row += 1) {
      for (let col = 0; col < width; col += 1) {
        if (opaque(col, row)) {
          continue;
        }
        let hit = false;
        for (let dy = -radius; dy <= radius && !hit; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            if (dx * dx + dy * dy > r2) {
              continue;
            }
            if (opaque(col + dx, row + dy)) {
              hit = true;
              break;
            }
          }
        }
        if (!hit) {
          continue;
        }
        const index = (row * width + col) * 4;
        dst[index] = red;
        dst[index + 1] = green;
        dst[index + 2] = blue;
        dst[index + 3] = Math.max(dst[index + 3]!, alpha);
      }
    }
  };
  stamp(glow, 176, 38, 255, 96);
  stamp(tight, 247, 237, 255, 235);
  const rim = document.createElement("canvas");
  rim.width = width;
  rim.height = readH;
  const rimCtx = rim.getContext("2d");
  if (!rimCtx) {
    return;
  }
  rimCtx.putImageData(out, 0, 0);
  context.drawImage(rim, x, drawY);
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
  rowLabels?: string[];
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  showNames?: boolean;
  story?: boolean;
}

export const renderPyramidCanvas = async (
  input: PyramidRenderInput,
  scale = 2,
) => {
  const boardH = input.story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
  const width = GRAPHIC_WIDTH * scale;
  const height = boardH * scale;
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
  for (let index = 0; index < slotCount; index += 1) {
    const slot = input.slots[index]!;
    const rect = pyramidCellRect(index, rowCount, boardH);
    const x = rect.x * s;
    const y = rect.y * s;
    const w = rect.w * s;
    const h = rect.h * s;
    const popping = slot ? pyramidSlotPops(slot) : false;
    const pop = popping ? rect.pop * s : 0;
    const drawY = y - pop;
    const drawH = h + pop;
    const quietLine =
      input.look === "none"
        ? 0
        : input.purpleFlair
          ? frameLinePx(s, input.look)
          : Math.max(1, Math.round(PYR_QUIET_FRAME * s));
    const team = getTeam(slot?.teamId);
    paintPyramidCellFill(
      context,
      fieldTexture,
      x,
      y,
      w,
      h,
      s,
      Boolean(input.purpleFlair),
      team?.cellFrom,
      team?.cellTo,
    );
    let photo: HTMLImageElement | null = null;
    if (slot?.photoSrc) {
      photo = slot.photoSrc.startsWith("data:")
        ? await loadImage(slot.photoSrc)
        : await loadCorsImage(slot.photoSrc);
    }
    const sprite = photo
      ? makeSlotSprite(photo, w, h, pop, slot.pan, input.photoGrade === true)
      : null;
    context.save();
    context.beginPath();
    context.rect(x, drawY, w, drawH);
    context.clip();
    if (sprite) {
      context.drawImage(sprite, x, drawY);
    }
    context.restore();
    if (sprite && popping && input.purpleFlair) {
      paintPopHeadRim(context, sprite, x, drawY, pop, s);
    }
    const rest = popping ? FRAME_FRONT : FRAME_ALL;
    paintCellFrameEdges(context, x, y, w, h, input.look, s, rest, quietLine);
    if (input.purpleFlair) {
      paintPurplePlateEdges(context, x, y, w, h, s, rest);
    }
    const line = quietLine;
    const purpleLine = input.purpleFlair ? purplePlateLinePx(s) : 0;
    const gap =
      sprite && popping
        ? headGapAtCellTop(sprite, pop, s, Math.max(line, purpleLine) + s)
        : null;
    if (popping) {
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

  if (input.showNames) {
    for (let index = 0; index < slotCount; index += 1) {
      const slot = input.slots[index]!;
      const name = `${slot.firstName} ${slot.lastName}`.replace(/\s+/g, " ").trim();
      if (!name) {
        continue;
      }
      const rect = pyramidCellRect(index, rowCount, boardH);
      const x = rect.x * s;
      const y = rect.y * s;
      const w = rect.w * s;
      const h = rect.h * s;
      const fadeH = h * 0.42;
      const fade = context.createLinearGradient(0, y + h - fadeH, 0, y + h);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(0.45, "rgba(0,0,0,0.7)");
      fade.addColorStop(1, "rgba(0,0,0,0.94)");
      context.fillStyle = fade;
      context.fillRect(x, y + h - fadeH, w, fadeH);
      context.font = `900 ${13 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillStyle = "#fff";
      context.shadowColor = "rgba(0,0,0,0.88)";
      context.shadowOffsetX = s;
      context.shadowOffsetY = 1.1 * s;
      context.fillText(name.toUpperCase(), x + w / 2, y + h - 8 * s, w - 12 * s);
      context.shadowColor = "transparent";
    }
  }

  const labels = input.rowLabels ?? [];
  labels.forEach((label, row) => {
    const text = label.replace(/\s+/g, " ").trim().toUpperCase();
    if (!text) {
      return;
    }
    const first = pyramidCellRect((row * (row + 1)) / 2, rowCount, boardH);
    context.font = `900 ${18 * s}px ${POSTER_FONT}`;
    context.textAlign = "right";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.08 * 18 * s);
    context.fillStyle = "#fff";
    context.shadowColor = "rgba(0,0,0,0.85)";
    context.shadowOffsetX = s;
    context.shadowOffsetY = 1.2 * s;
    context.fillText(text, first.x * s - 10 * s, (first.y + first.h / 2) * s);
    context.shadowColor = "transparent";
    setLetterSpacing(context, 0);
  });

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
