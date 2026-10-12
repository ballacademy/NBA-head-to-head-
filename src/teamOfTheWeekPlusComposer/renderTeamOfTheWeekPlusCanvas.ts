import {
  frameColor,
  frameLinePx,
  paintCellFrame,
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
  PLUS_BRAND_SIZE,
  PLUS_CAPTION_SIZE,
  PLUS_CHROME_H,
  PLUS_NAME_SIZE,
  PLUS_STANDOUT_CAPTION_SIZE,
  PLUS_STANDOUT_COUNT,
  PLUS_STANDOUT_NAME_SIZE,
  PLUS_STANDOUT_PAD_X,
  PLUS_STARTER_COUNT,
  PLUS_STARTER_PAD_X,
  PLUS_WEEK_SIZE,
  plusBarRect,
  plusBoardMetrics,
  plusCellRect,
} from "./teamOfTheWeekPlusLayout";
import type { TotwStrip } from "./teamOfTheWeekPlusState";

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
  context.shadowOffsetX = Math.round(1.1 * scale);
  context.shadowOffsetY = Math.round(1.3 * scale);
  context.shadowBlur = 0;
  paint();
  context.restore();
};

const clipBarCell = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  first: boolean,
) => {
  const line = frameLinePx(scale);
  const inner = {
    x: first ? x + line : x,
    y: y + line,
    w: w - (first ? line : 0) - line,
    h: h - line * 2,
  };
  context.beginPath();
  context.rect(inner.x, inner.y, inner.w, inner.h);
  context.clip();
  return inner;
};

const drawPortrait = async (
  context: CanvasRenderingContext2D,
  slot: TotwStrip,
  x: number,
  y: number,
  w: number,
  h: number,
  nameH: number,
  nameSize: number,
  scale: number,
  first: boolean,
) => {
  const line = frameLinePx(scale);
  context.save();
  context.fillStyle = "#111";
  context.fillRect(x, y, w, h);
  const inner = clipBarCell(context, x, y, w, h, scale, first);
  if (slot.photoSrc) {
    const photo = slot.photoSrc.startsWith("data:")
      ? await loadImage(slot.photoSrc)
      : await loadCorsImage(slot.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        inner.x,
        inner.y,
        inner.w,
        inner.h,
        slot.pan.x,
        slot.pan.y,
        photoZoom(slot.pan),
      );
      const rotate = photoRotate(slot.pan);
      if (rotate) {
        context.save();
        context.translate(inner.x + inner.w / 2, inner.y + inner.h / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - (inner.x + inner.w / 2),
          dest.dy - (inner.y + inner.h / 2),
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

  const barH = Math.max(line, nameH * scale - line);
  const barY = y + h - line - barH;
  const barX = first ? x + line : x;
  const barW = w - (first ? line : 0) - line;
  context.fillStyle = "rgba(8, 8, 8, 0.84)";
  context.fillRect(barX, barY, barW, barH);
  const name = (slot.lastName || slot.firstName).toUpperCase();
  if (name) {
    context.font = `900 ${nameSize * scale}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.08 * nameSize * scale);
    context.fillStyle = "#fff";
    withShadow(context, scale, () => {
      context.fillText(name, barX + barW / 2, barY + barH / 2 + 0.5 * scale);
    });
    setLetterSpacing(context, 0);
  }
};

const paintBarChrome = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cellW: number,
  count: number,
  look: ComposerLook | undefined,
  scale: number,
) => {
  paintCellFrame(context, x, y, w, h, look, scale);
  const line = frameLinePx(scale);
  context.fillStyle = frameColor(look);
  for (let index = 1; index < count; index += 1) {
    context.fillRect(x + index * cellW - line, y, line, h);
  }
};

const drawCaption = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  size: number,
  scale: number,
) => {
  const label = text.trim().toUpperCase();
  context.font = `900 ${size * scale}px ${POSTER_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.16 * size * scale);
  const labelW = label
    ? Math.min(w * 0.72, context.measureText(label).width + 8 * scale)
    : 0;
  withShadow(context, scale, () => {
    context.fillStyle = "#fff";
    context.fillText(label, x, y + h / 2);
  });
  setLetterSpacing(context, 0);
  const ruleX = x + labelW + 12 * scale;
  const ruleW = x + w - ruleX;
  if (ruleW > 16 * scale) {
    context.fillStyle = "rgba(255, 255, 255, 0.28)";
    context.fillRect(ruleX, y + h / 2, ruleW, Math.max(1, 1.2 * scale));
  }
};

export interface TeamOfTheWeekPlusRenderInput {
  brand: string;
  week: string;
  starterCaption: string;
  standoutCaption: string;
  slots: TotwStrip[];
  look?: ComposerLook;
  showBa?: boolean;
}

export const renderTeamOfTheWeekPlusCanvas = async (
  input: TeamOfTheWeekPlusRenderInput,
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
    ?.load(`900 ${PLUS_BRAND_SIZE * scale}px ${POSTER_FONT}`)
    .catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);

  const s = scale;
  const metrics = plusBoardMetrics();
  const week = input.week.trim().toUpperCase();
  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 36 * s;
      context.drawImage(
        ba,
        (width - size) / 2,
        week ? 8 * s : (PLUS_CHROME_H * s - size) / 2,
        size,
        size,
      );
    }
  } else {
    const brand = input.brand.trim() || "BALLACADEMY";
    withShadow(context, s, () => {
      context.font = `900 ${PLUS_BRAND_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      setLetterSpacing(context, 0.2 * PLUS_BRAND_SIZE * s);
      context.fillStyle = "#fff";
      context.fillText(brand.toUpperCase(), width / 2, (week ? 28 : 35) * s);
      setLetterSpacing(context, 0);
    });
  }

  if (week) {
    context.font = `900 ${PLUS_WEEK_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.12 * PLUS_WEEK_SIZE * s);
    context.fillStyle = "rgba(255, 255, 255, 0.78)";
    context.fillText(week, width / 2, 50 * s);
    setLetterSpacing(context, 0);
  }

  drawCaption(
    context,
    input.starterCaption,
    PLUS_STARTER_PAD_X * s,
    metrics.starterCaptionY * s,
    width - PLUS_STARTER_PAD_X * 2 * s,
    metrics.captionH * s,
    PLUS_CAPTION_SIZE,
    s,
  );
  drawCaption(
    context,
    input.standoutCaption,
    PLUS_STANDOUT_PAD_X * s,
    metrics.standoutCaptionY * s,
    width - PLUS_STANDOUT_PAD_X * 2 * s,
    metrics.captionH * s,
    PLUS_STANDOUT_CAPTION_SIZE,
    s,
  );

  for (let index = 0; index < PLUS_STARTER_COUNT; index += 1) {
    const rect = plusCellRect("starters", index);
    await drawPortrait(
      context,
      input.slots[index]!,
      rect.x * s,
      rect.y * s,
      rect.w * s,
      rect.h * s,
      rect.nameH,
      PLUS_NAME_SIZE,
      s,
      index === 0,
    );
  }
  const starterBar = plusBarRect("starters");
  paintBarChrome(
    context,
    starterBar.x * s,
    starterBar.y * s,
    starterBar.w * s,
    starterBar.h * s,
    metrics.starterW * s,
    PLUS_STARTER_COUNT,
    input.look,
    s,
  );

  for (let index = 0; index < PLUS_STANDOUT_COUNT; index += 1) {
    const rect = plusCellRect("standouts", index);
    await drawPortrait(
      context,
      input.slots[PLUS_STARTER_COUNT + index]!,
      rect.x * s,
      rect.y * s,
      rect.w * s,
      rect.h * s,
      rect.nameH,
      PLUS_STANDOUT_NAME_SIZE,
      s,
      index === 0,
    );
  }
  const standoutBar = plusBarRect("standouts");
  paintBarChrome(
    context,
    standoutBar.x * s,
    standoutBar.y * s,
    standoutBar.w * s,
    standoutBar.h * s,
    metrics.standoutW * s,
    PLUS_STANDOUT_COUNT,
    input.look,
    s,
  );

  return canvas;
};
