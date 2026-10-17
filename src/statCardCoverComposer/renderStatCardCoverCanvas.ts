import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { drawPlayerNameFade } from "../instagramComposer/drawPlayerNameFade";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import {
  applyPhotoGrade,
  canvasGradeFilter,
  gradedWatermarkOpacity,
} from "../instagramComposer/photoGrade";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  SCC_BA_INSET,
  SCC_BA_SIZE,
  SCC_DATE_SIZE,
  SCC_DATE_TRACK,
  SCC_FADE_H,
  SCC_LOCKUP_SCRIM_H,
  SCC_PHOTO_SHIFT,
  SCC_GOLD,
  SCC_GOLD_DEEP,
  SCC_GOLD_HAIR,
  SCC_LOCKUP_TOP,
  SCC_MARK,
  SCC_PILL_H,
  SCC_PILL_PAD_X,
  SCC_SEAM_W,
  SCC_SLOT_COUNT,
  SCC_SWIPE_CHEV,
  SCC_SWIPE_INSET,
  SCC_SWIPE_LABEL,
  SCC_SWIPE_SIZE,
  SCC_SWIPE_STROKE,
  SCC_TITLE_LEAD_TRACK,
  SCC_TITLE_SIZE,
  SCC_TITLE_TRACK,
  coverCellRect,
  coverNameMetrics,
  coverSeamXs,
} from "./statCardCoverLayout";
import {
  coverSlotName,
  splitCoverTitle,
  type CoverSlot,
  type StatCardCoverDraft,
} from "./statCardCoverState";

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
  maxWidth?: number,
) => {
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.strokeStyle = stroke;
  context.lineWidth = strokeWidth;
  if (maxWidth) {
    context.strokeText(text, x, y, maxWidth);
    context.fillStyle = fill;
    context.fillText(text, x, y, maxWidth);
  } else {
    context.strokeText(text, x, y);
    context.fillStyle = fill;
    context.fillText(text, x, y);
  }
};

const paintTopFade = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const fade = context.createLinearGradient(0, 0, 0, height);
  fade.addColorStop(0, "rgba(0, 0, 0, 0.92)");
  fade.addColorStop(0.32, "rgba(0, 0, 0, 0.78)");
  fade.addColorStop(0.58, "rgba(0, 0, 0, 0.46)");
  fade.addColorStop(0.82, "rgba(0, 0, 0, 0.14)");
  fade.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = fade;
  context.fillRect(0, 0, width, height);
};

const paintSeam = (
  context: CanvasRenderingContext2D,
  x: number,
  height: number,
  width: number,
  scale: number,
  goldOn = true,
) => {
  const fade = context.createLinearGradient(x, 0, x + width, 0);
  fade.addColorStop(0, "rgba(0, 0, 0, 0)");
  fade.addColorStop(0.5, "rgba(0, 0, 0, 0.42)");
  fade.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = fade;
  context.fillRect(x, 0, width, height);
  if (!goldOn) {
    return;
  }
  const goldW = SCC_GOLD_HAIR * scale;
  const gx = x + width / 2 - goldW / 2;
  const gold = context.createLinearGradient(0, 0, 0, height);
  gold.addColorStop(0, "rgba(250, 204, 21, 0)");
  gold.addColorStop(0.18, "rgba(212, 175, 55, 0.82)");
  gold.addColorStop(0.5, "rgba(250, 204, 21, 0.95)");
  gold.addColorStop(0.82, "rgba(212, 175, 55, 0.82)");
  gold.addColorStop(1, "rgba(250, 204, 21, 0)");
  context.fillStyle = gold;
  context.fillRect(gx, height * 0.08, goldW, height * 0.8);
};

const drawCellPhoto = async (
  context: CanvasRenderingContext2D,
  slot: CoverSlot,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  photoGrade = false,
  watermarkOpacity = 0,
) => {
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.fillStyle = "#111";
  context.fillRect(x, y, w, h);
  if (slot.photoSrc) {
    const photo = slot.photoSrc.startsWith("data:")
      ? await loadImage(slot.photoSrc)
      : await loadCorsImage(slot.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        x,
        y,
        w,
        h,
        slot.pan.x,
        slot.pan.y,
        photoZoom(slot.pan),
      );
      const shiftY = h * SCC_PHOTO_SHIFT;
      const dy = dest.dy + shiftY;
      const rotate = photoRotate(slot.pan);
      context.save();
      context.filter = canvasGradeFilter(photoGrade);
      if (rotate) {
        context.translate(x + w / 2, y + h / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - (x + w / 2),
          dy - (y + h / 2),
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dy, dest.dw, dest.dh);
      }
      context.restore();
      applyPhotoGrade(context, x, y, w, h, photoGrade);
      paintPhotoVignette(context, x, y, w, h, photoGrade);
    }
  }
  context.restore();

  const team = getTeam(slot.teamId);
  if (team && watermarkOpacity > 0) {
    const mark = await loadImage(team.logoSrc);
    if (mark) {
      const size = SCC_MARK * scale;
      context.save();
      context.globalAlpha = watermarkOpacity;
      drawCenteredLogo(
        context,
        mark,
        x + (w - size) / 2,
        y + h * 0.42 - size / 2,
        size,
        size,
        {
          cacheKey: `${team.logoSrc}-stat-cover-mark`,
          fitX: 0.9,
          fitY: 0.9,
          shadow: 0,
        },
      );
      context.restore();
    }
  }

  if (slot.playerId || coverSlotName(slot)) {
    const metrics = coverNameMetrics(index);
    const barH = metrics.nameH * scale;
    const logo = team ? await loadImage(team.logoSrc) : null;
    drawPlayerNameFade(context, {
      x,
      y: y + h - barH,
      w,
      h: barH,
      given: slot.firstName,
      family: slot.lastName,
      logo,
      logoSrc: team?.logoSrc,
      logoSize: metrics.logo * scale,
      familySize: metrics.family * scale,
      givenSize: metrics.given * scale,
      scale,
    });
  }
};

const drawSwipeCue = (
  context: CanvasRenderingContext2D,
  scale: number,
  width: number,
  goldOn = true,
) => {
  const s = scale;
  const size = SCC_SWIPE_SIZE * s;
  const cx = width - SCC_SWIPE_INSET * s - size / 2;
  const cy = GRAPHIC_HEIGHT * 0.56 * s;
  const ink = goldOn ? SCC_GOLD : "#fff";
  const ring = goldOn ? SCC_GOLD_DEEP : "rgba(255, 255, 255, 0.88)";
  const label = SCC_SWIPE_LABEL * s;
  const arm = (SCC_SWIPE_CHEV / 2) * s;
  context.save();
  context.font = `900 ${label}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  setLetterSpacing(context, 0.22 * label);
  context.fillStyle = ink;
  withShadow(context, s, () => {
    context.fillText("SWIPE", cx, cy - size / 2 - 8 * s);
  });
  setLetterSpacing(context, 0);
  context.beginPath();
  context.arc(cx, cy, size / 2, 0, Math.PI * 2);
  context.fillStyle = "rgba(0, 0, 0, 0.42)";
  context.fill();
  context.lineWidth = 2.6 * s;
  context.strokeStyle = ring;
  context.stroke();
  context.translate(cx + 2 * s, cy);
  context.rotate(Math.PI / 4);
  context.strokeStyle = ink;
  context.lineWidth = SCC_SWIPE_STROKE * s;
  context.beginPath();
  // Top + right edges of a square, rotated 45° → chevron points right (carousel next).
  context.moveTo(-arm, -arm);
  context.lineTo(arm, -arm);
  context.lineTo(arm, arm);
  context.stroke();
  context.restore();
};

export type StatCardCoverRenderInput = StatCardCoverDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
};

export const renderStatCardCoverCanvas = async (
  input: StatCardCoverRenderInput,
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
    document.fonts?.load(`900 ${SCC_TITLE_SIZE * scale}px ${POSTER_FONT}`),
    document.fonts?.load(`900 ${SCC_DATE_SIZE * scale}px ${POSTER_FONT}`),
  ]).catch(() => undefined);

  context.fillStyle = "#050505";
  context.fillRect(0, 0, width, height);
  const s = scale;
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const watermark = parseComposerWatermark(input.watermark);
  const watermarkOpacity = gradedWatermarkOpacity(
    composerWatermarkOpacity(watermark),
    input.photoGrade,
  );

  for (let index = 0; index < SCC_SLOT_COUNT; index += 1) {
    const slot = input.slots[index]!;
    const cell = coverCellRect(index);
    await drawCellPhoto(
      context,
      slot,
      index,
      cell.x * s,
      cell.y * s,
      cell.w * s,
      cell.h * s,
      s,
      input.photoGrade === true,
      watermarkOpacity,
    );
  }

  const goldOn = input.showGold !== false;
  for (const seamX of coverSeamXs()) {
    paintSeam(
      context,
      (seamX - SCC_SEAM_W / 2) * s,
      height,
      SCC_SEAM_W * s,
      s,
      goldOn,
    );
  }
  paintTopFade(context, width, SCC_FADE_H * s);
  const scrim = context.createRadialGradient(
    width / 2,
    120 * s,
    16 * s,
    width / 2,
    120 * s,
    640 * s,
  );
  scrim.addColorStop(0, "rgba(0, 0, 0, 0.64)");
  scrim.addColorStop(0.56, "rgba(0, 0, 0, 0.22)");
  scrim.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = scrim;
  context.fillRect(0, 0, width, SCC_LOCKUP_SCRIM_H * s);

  const cx = width / 2;
  let cursor = SCC_LOCKUP_TOP * s;
  const lines = splitCoverTitle(input.title);
  context.textAlign = "center";
  context.textBaseline = "top";
  context.font = `900 ${SCC_TITLE_SIZE * s}px ${POSTER_FONT}`;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]!;
    const tracking =
      lines.length > 1 && lineIndex === 0
        ? SCC_TITLE_LEAD_TRACK
        : SCC_TITLE_TRACK;
    setLetterSpacing(context, tracking * SCC_TITLE_SIZE * s);
    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.45)";
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 8 * s;
    context.shadowBlur = 18 * s;
    strokeFillText(
        context,
        line,
        cx,
        cursor,
        goldOn ? SCC_GOLD : "#fff",
        "#000",
        3.4 * s,
        width - 200 * s,
      );
    context.restore();
    withShadow(context, s, () => {
      strokeFillText(
        context,
        line,
        cx,
        cursor,
        goldOn ? SCC_GOLD : "#fff",
        "#000",
        3.4 * s,
        width - 200 * s,
      );
    });
    cursor += SCC_TITLE_SIZE * 0.84 * s;
  }
  setLetterSpacing(context, 0);
  cursor += 14 * s;

  const date = (input.dateLine || "").toUpperCase();
  if (date) {
    context.font = `900 ${SCC_DATE_SIZE * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, SCC_DATE_TRACK * SCC_DATE_SIZE * s);
    const pillW = Math.max(
      148 * s,
      context.measureText(date).width + SCC_PILL_PAD_X * 2 * s,
    );
    const pillH = SCC_PILL_H * s;
    const pillX = cx - pillW / 2;
    context.fillStyle = "#fff";
    context.beginPath();
    const r = pillH / 2;
    context.moveTo(pillX + r, cursor);
    context.arcTo(pillX + pillW, cursor, pillX + pillW, cursor + pillH, r);
    context.arcTo(pillX + pillW, cursor + pillH, pillX, cursor + pillH, r);
    context.arcTo(pillX, cursor + pillH, pillX, cursor, r);
    context.arcTo(pillX, cursor, pillX + pillW, cursor, r);
    context.closePath();
    context.fill();
    context.lineWidth = 2 * s;
    context.strokeStyle = goldOn ? SCC_GOLD_DEEP : "#fff";
    context.stroke();
    context.fillStyle = "#111";
    context.textBaseline = "middle";
    context.fillText(date, cx, cursor + pillH / 2);
    setLetterSpacing(context, 0);
  }

  drawSwipeCue(context, s, width, goldOn);

  paintCellFrame(context, 0, 0, width, height, input.look, s);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = SCC_BA_SIZE * s;
      const inset = SCC_BA_INSET * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
