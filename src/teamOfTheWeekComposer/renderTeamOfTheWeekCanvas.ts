import {
  clipToInnerFrame,
  paintCellFrame,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { loadCorsImage } from "../lib/playerHeadshots";
import {
  FIELD_TEXTURE_SRC,
  drawBannerInterior,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  TOTW_BRAND_SIZE,
  TOTW_FOOTER_H,
  TOTW_PLATE_X,
  TOTW_STRIP_H,
  TOTW_STRIP_W,
  TOTW_STRIPS_TOP,
  TOTW_TITLE_PAD,
  TOTW_TITLE_PLATE_H,
  TOTW_TITLE_SIZE,
  TOTW_WEEK_H,
  TOTW_WEEK_SIZE,
  totwStripX,
} from "./teamOfTheWeekLayout";
import {
  TOTW_STRIP_COUNT,
  TOTW_TITLE_TRACK,
  splitTotwTitle,
  type TotwStrip,
} from "./teamOfTheWeekState";

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

const drawStripPhoto = async (
  context: CanvasRenderingContext2D,
  strip: TotwStrip,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  look?: ComposerLook | null,
) => {
  context.save();
  context.fillStyle = "#111";
  context.fillRect(x, y, w, h);
  const inner = clipToInnerFrame(context, x, y, w, h, scale);
  if (strip.photoSrc) {
    const photo = strip.photoSrc.startsWith("data:")
      ? await loadImage(strip.photoSrc)
      : await loadCorsImage(strip.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        inner.x,
        inner.y,
        inner.w,
        inner.h,
        strip.pan.x,
        strip.pan.y,
        photoZoom(strip.pan),
      );
      const rotate = photoRotate(strip.pan);
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
  paintCellFrame(context, x, y, w, h, look, scale);
};

export interface TeamOfTheWeekRenderInput {
  brand: string;
  title: string;
  week: string;
  strips: TotwStrip[];
  look?: ComposerLook;
  showBa?: boolean;
}

export const renderTeamOfTheWeekCanvas = async (
  input: TeamOfTheWeekRenderInput,
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
  await Promise.all([
    document.fonts?.load(`900 ${TOTW_TITLE_SIZE * scale}px ${POSTER_FONT}`),
    document.fonts?.load(
      `italic 900 ${TOTW_TITLE_SIZE * scale}px ${POSTER_FONT}`,
    ),
  ]).catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);

  const s = scale;
  withShadow(context, s, () => {
    context.font = `900 ${TOTW_BRAND_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.18 * TOTW_BRAND_SIZE * s);
    context.fillStyle = "#fff";
    context.fillText(input.brand.toUpperCase(), width / 2, 30 * s);
    setLetterSpacing(context, 0);
  });

  const stripY = TOTW_STRIPS_TOP * s;
  const stripH = TOTW_STRIP_H * s;
  const stripW = TOTW_STRIP_W * s;
  for (let index = 0; index < TOTW_STRIP_COUNT; index += 1) {
    const strip = input.strips[index] ?? {
      playerId: null,
      teamId: null,
      firstName: "",
      lastName: "",
      photoSrc: null,
      customPhoto: false,
      pan: { x: 0.5, y: 0.22 },
    };
    await drawStripPhoto(
      context,
      strip,
      totwStripX(index) * s,
      stripY,
      stripW,
      stripH,
      s,
      input.look,
    );
  }

  const plate = {
    x: TOTW_PLATE_X * s,
    y: (GRAPHIC_HEIGHT - TOTW_FOOTER_H) * s,
    w: width - TOTW_PLATE_X * 2 * s,
    h: TOTW_TITLE_PLATE_H * s,
  };
  drawBannerInterior(context, plate.x, plate.y, plate.w, plate.h, s, () => {
    context.beginPath();
    context.rect(plate.x, plate.y, plate.w, plate.h);
  });
  paintCellFrame(context, plate.x, plate.y, plate.w, plate.h, input.look, s);

  const titleLines = splitTotwTitle(input.title);
  const lineH = TOTW_TITLE_SIZE * 0.92 * s;
  const titleBlock = lineH * titleLines.length;
  let titleY = plate.y + (plate.h - titleBlock) / 2 + lineH / 2;
  context.save();
  const titleInner = clipToInnerFrame(
    context,
    plate.x,
    plate.y,
    plate.w,
    plate.h,
    s,
  );
  const titlePad = TOTW_TITLE_PAD * s;
  context.beginPath();
  context.rect(
    titleInner.x + titlePad,
    titleInner.y + titlePad,
    titleInner.w - titlePad * 2,
    titleInner.h - titlePad * 2,
  );
  context.clip();
  context.font = `italic 900 ${TOTW_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, TOTW_TITLE_TRACK * TOTW_TITLE_SIZE * s);
  titleLines.forEach((line) => {
    withShadow(context, s, () => {
      strokeFillText(
        context,
        line,
        width / 2,
        titleY,
        "#fff",
        "#000",
        3.2 * s,
      );
    });
    titleY += lineH;
  });
  setLetterSpacing(context, 0);
  context.restore();

  const weekText = input.week.trim().toUpperCase() || "WEEK 1";
  context.font = `900 ${TOTW_WEEK_SIZE * s}px ${POSTER_FONT}`;
  const weekW = Math.max(320 * s, context.measureText(weekText).width + 48 * s);
  const weekH = TOTW_WEEK_H * s;
  const weekX = (width - weekW) / 2;
  const weekY = plate.y + plate.h - 2 * s;
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(weekX + weekW * 0.06, weekY);
  context.lineTo(weekX + weekW * 0.94, weekY);
  context.lineTo(weekX + weekW, weekY + weekH);
  context.lineTo(weekX, weekY + weekH);
  context.closePath();
  context.fill();
  context.fillStyle = "#111";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(weekText, width / 2, weekY + weekH / 2);

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
