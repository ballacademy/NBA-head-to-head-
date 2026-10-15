import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import {
  PHOTO_GRADE_FILTER,
  applyPhotoGrade,
} from "../instagramComposer/photoGrade";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
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
  CMP_BA,
  CMP_PAD,
  CMP_PHOTO_H,
  CMP_PHOTO_TOP,
  CMP_PHOTO_W,
  CMP_STATS_W,
  CMP_SUB_H,
  CMP_SUB_SIZE,
  CMP_TITLE_H,
  CMP_TITLE_SIZE,
  CMP_NAME_SIZE,
  CMP_LEAD,
  compareStatGutter,
  compareStatType,
} from "./compareLayout";
import {
  compareSideCaption,
  leadingSide,
  type CompareDraft,
} from "./compareState";
import { getTeam } from "../standingsComposer/teams";

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
  }
};

const strokeFill = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  strokeW: number,
) => {
  context.lineJoin = "round";
  if (strokeW > 0) {
    context.strokeStyle = "#000";
    context.lineWidth = strokeW;
    context.strokeText(text, x, y);
  }
  context.fillStyle = fill;
  context.fillText(text, x, y);
};

export type CompareRenderInput = CompareDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
};

export const renderCompareCanvas = async (
  input: CompareRenderInput,
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
  const s = scale;
  const field = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, field, width, height);
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const titleX = CMP_PAD * s;
  const titleW = width - CMP_PAD * 2 * s;
  const titleY = 36 * s;
  const titleH = CMP_TITLE_H * s;
  context.fillStyle = "#1c1c1c";
  context.fillRect(titleX, titleY, titleW, titleH);
  paintCellFrame(context, titleX, titleY, titleW, titleH, input.look, s);
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, titleX, titleY, titleW, titleH, s);
  }
  context.font = `900 ${CMP_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.04 * CMP_TITLE_SIZE * s);
  context.fillStyle = "#fff";
  context.fillText(
    input.title.trim().toUpperCase() || "COMPARE",
    width / 2,
    titleY + titleH / 2,
    titleW - 24 * s,
  );
  setLetterSpacing(context, 0);

  const photoY = CMP_PHOTO_TOP * s;
  const photoH = CMP_PHOTO_H * s;
  const leftX = 36 * s;
  const rightX = width - 36 * s - CMP_PHOTO_W * s;
  const statsX = leftX + CMP_PHOTO_W * s + 8 * s;
  const statsW = CMP_STATS_W * s;

  for (const [side, x] of [
    [0, leftX],
    [1, rightX],
  ] as const) {
    const person = input.sides[side]!;
    context.fillStyle = "#111";
    context.fillRect(x, photoY, CMP_PHOTO_W * s, photoH);
    const watermark = parseComposerWatermark(input.watermark);
    const team = getTeam(person.teamId);
    if (team && watermark !== "off") {
      const mark = await loadImage(team.logoSrc);
      if (mark) {
        const size = 220 * s;
        context.save();
        context.globalAlpha = composerWatermarkOpacity(watermark);
        context.drawImage(
          mark,
          x + (CMP_PHOTO_W * s - size) / 2,
          photoY + photoH * 0.28,
          size,
          size,
        );
        context.restore();
      }
    }
    if (person.photoSrc) {
      const photo = person.photoSrc.startsWith("data:")
        ? await loadImage(person.photoSrc)
        : await loadCorsImage(person.photoSrc);
      if (photo) {
        const dest = coverPanDraw(
          photo.naturalWidth || photo.width,
          photo.naturalHeight || photo.height,
          x,
          photoY,
          CMP_PHOTO_W * s,
          photoH,
          person.pan.x,
          person.pan.y,
          photoZoom(person.pan),
        );
        context.save();
        if (input.photoGrade) {
          context.filter = PHOTO_GRADE_FILTER;
        }
        context.beginPath();
        context.rect(x, photoY, CMP_PHOTO_W * s, photoH);
        context.clip();
        const rotate = photoRotate(person.pan);
        if (rotate) {
          context.translate(x + (CMP_PHOTO_W * s) / 2, photoY + photoH / 2);
          context.rotate((rotate * Math.PI) / 180);
          context.drawImage(
            photo,
            dest.dx - x - (CMP_PHOTO_W * s) / 2,
            dest.dy - photoY - photoH / 2,
            dest.dw,
            dest.dh,
          );
        } else {
          context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
        }
        context.restore();
        applyPhotoGrade(
          context,
          x,
          photoY,
          CMP_PHOTO_W * s,
          photoH,
          input.photoGrade,
        );
        paintPhotoVignette(
          context,
          x,
          photoY,
          CMP_PHOTO_W * s,
          photoH,
          input.photoGrade,
        );
      }
    }
    paintCellFrame(context, x, photoY, CMP_PHOTO_W * s, photoH, input.look, s);
    const caption = compareSideCaption(person);
    if (caption) {
      const fadeH = 96 * s;
      const fade = context.createLinearGradient(
        0,
        photoY + photoH - fadeH,
        0,
        photoY + photoH,
      );
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(0.45, "rgba(0,0,0,0.72)");
      fade.addColorStop(1, "rgba(0,0,0,0.92)");
      context.fillStyle = fade;
      context.fillRect(x, photoY + photoH - fadeH, CMP_PHOTO_W * s, fadeH);
      context.font = `900 ${CMP_NAME_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "bottom";
      setLetterSpacing(context, 0.08 * CMP_NAME_SIZE * s);
      context.fillStyle = "#fff";
      context.fillText(
        caption.toUpperCase(),
        x + (CMP_PHOTO_W * s) / 2,
        photoY + photoH - 16 * s,
        CMP_PHOTO_W * s - 20 * s,
      );
      setLetterSpacing(context, 0);
    }
  }

  const type = compareStatType(input.stats.length);
  const gutter = compareStatGutter(input.stats.length);
  context.font = `900 ${18 * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.16 * 18 * s);
  context.fillStyle = "#fff";
  context.fillText(
    (input.statsLabel || "STATS").toUpperCase(),
    statsX + statsW / 2,
    photoY + 29 * s,
    statsW,
  );
  setLetterSpacing(context, 0);

  const rowCount = Math.max(input.stats.length, 1);
  const bodyTop = photoY + 46 * s;
  const bodyH = photoH - 70 * s - gutter.nameReserve * s;
  const rowSpan = bodyH / rowCount;
  input.stats.forEach((stat, index) => {
    const y = bodyTop + index * rowSpan + rowSpan / 2;
    const lead = leadingSide(stat.left, stat.right);
    const mid = statsX + statsW / 2;
    context.fillStyle = "rgba(255,255,255,0.45)";
    context.fillRect(
      mid - s,
      y - (type.rule * s) / 2,
      2 * s,
      type.rule * s,
    );
    context.font = `900 ${type.value * s}px ${POSTER_FONT}`;
    context.textBaseline = "middle";
    context.textAlign = "right";
    strokeFill(
      context,
      stat.left,
      mid - 16 * s,
      y - type.label * 0.55 * s,
      lead === 0 ? CMP_LEAD : "#fff",
      type.stroke * s,
    );
    context.textAlign = "left";
    strokeFill(
      context,
      stat.right,
      mid + 16 * s,
      y - type.label * 0.55 * s,
      lead === 1 ? CMP_LEAD : "#fff",
      type.stroke * s,
    );
    const unit = (stat.label || "").toUpperCase();
    context.font = `900 ${type.label * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.14 * type.label * s);
    context.textAlign = "right";
    context.fillStyle = lead === 0 ? CMP_LEAD : "rgba(255,255,255,0.78)";
    context.fillText(unit, mid - 16 * s, y + type.value * 0.42 * s);
    context.textAlign = "left";
    context.fillStyle = lead === 1 ? CMP_LEAD : "rgba(255,255,255,0.78)";
    context.fillText(unit, mid + 16 * s, y + type.value * 0.42 * s);
    setLetterSpacing(context, 0);
  });

  const subY = height - 36 * s - CMP_SUB_H * s;
  context.fillStyle = "#1c1c1c";
  context.fillRect(titleX, subY, titleW, CMP_SUB_H * s);
  paintCellFrame(context, titleX, subY, titleW, CMP_SUB_H * s, input.look, s);
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, titleX, subY, titleW, CMP_SUB_H * s, s);
  }
  context.font = `900 ${CMP_SUB_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.06 * CMP_SUB_SIZE * s);
  context.fillStyle = "#fff";
  context.fillText(
    input.subtitle.trim().toUpperCase(),
    width / 2,
    subY + (CMP_SUB_H * s) / 2,
    titleW - 24 * s,
  );
  setLetterSpacing(context, 0);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = CMP_BA * s;
      const x = (width - size) / 2;
      const y = 140 * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, x, y, size);
      }
      context.drawImage(ba, x, y, size, size);
    }
  }

  return canvas;
};
