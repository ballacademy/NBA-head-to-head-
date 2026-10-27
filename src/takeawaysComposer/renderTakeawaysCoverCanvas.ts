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
import { paintBoardField } from "../standingsComposer/headerTexture";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  SCC_BA_INSET,
  SCC_BA_SIZE,
  SCC_DATE_TRACK,
  SCC_GOLD,
  SCC_GOLD_DEEP,
  SCC_MARK,
  SCC_SWIPE_CHEV,
  SCC_SWIPE_INSET,
  SCC_SWIPE_LABEL,
  SCC_SWIPE_SIZE,
  SCC_SWIPE_STROKE,
  coverCellRect,
  coverNameMetrics,
  coverSeamXs,
} from "../statCardCoverComposer/statCardCoverLayout";
import {
  TK_DATE_SIZE,
  TK_FADE_H,
  TK_GOLD_HAIR,
  TK_LOCKUP_SCRIM_H,
  TK_LOCKUP_TOP,
  TK_PHOTO_SHIFT,
  TK_PICK_SIZE,
  TK_PILL_H,
  TK_PILL_PAD_X,
  TK_SEAM_W,
  TK_TITLE_LEAD_TRACK,
  TK_TITLE_SIZE,
  TK_TITLE_TRACK,
} from "./takeawaysLayout";
import {
  splitTakeawaysTitle,
  takeawaysCardName,
  takeawaysCoverViewCards,
  takeawaysWeekPill,
  type TakeawaysCard,
  type TakeawaysDraft,
} from "./takeawaysState";

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

const cellRect = (index: number, count: number, boardH: number) => {
  if (count <= 1) {
    return { x: 0, y: 0, w: GRAPHIC_WIDTH, h: boardH };
  }
  return coverCellRect(index, count, boardH);
};

const paintEmptyPoster = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  label = "PICK PLAYER",
) => {
  context.fillStyle = "#0a0a0c";
  context.fillRect(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h * 0.4;
  const glow = context.createRadialGradient(
    cx,
    cy,
    16 * scale,
    cx,
    cy,
    Math.max(w, h) * 0.55,
  );
  glow.addColorStop(0, "rgba(212, 175, 55, 0.36)");
  glow.addColorStop(0.5, "rgba(250, 204, 21, 0.1)");
  glow.addColorStop(1, "rgba(10, 10, 12, 0)");
  context.fillStyle = glow;
  context.fillRect(x, y, w, h);
  context.save();
  context.font = `900 ${TK_PICK_SIZE * scale}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.16 * TK_PICK_SIZE * scale);
  context.fillStyle = "#facc15";
  withShadow(context, scale, () => {
    context.fillText(label, cx, y + h * 0.48, w - 40 * scale);
  });
  setLetterSpacing(context, 0);
  context.restore();
};

const paintTopFade = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const fade = context.createLinearGradient(0, 0, 0, height);
  fade.addColorStop(0, "rgba(0, 0, 0, 0.96)");
  fade.addColorStop(0.26, "rgba(0, 0, 0, 0.86)");
  fade.addColorStop(0.52, "rgba(0, 0, 0, 0.56)");
  fade.addColorStop(0.78, "rgba(0, 0, 0, 0.2)");
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
  fade.addColorStop(0.5, "rgba(0, 0, 0, 0.5)");
  fade.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = fade;
  context.fillRect(x, 0, width, height);
  if (!goldOn) {
    return;
  }
  const goldW = TK_GOLD_HAIR * scale;
  const gx = x + width / 2 - goldW / 2;
  const gold = context.createLinearGradient(0, 0, 0, height);
  gold.addColorStop(0, "rgba(250, 204, 21, 0)");
  gold.addColorStop(0.16, "rgba(212, 175, 55, 0.9)");
  gold.addColorStop(0.5, "rgba(253, 230, 138, 1)");
  gold.addColorStop(0.84, "rgba(212, 175, 55, 0.9)");
  gold.addColorStop(1, "rgba(250, 204, 21, 0)");
  context.fillStyle = gold;
  context.fillRect(gx, height * 0.08, goldW, height * 0.8);
};

const drawCellPhoto = async (
  context: CanvasRenderingContext2D,
  slot: TakeawaysCard,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  photoGrade = false,
  watermarkOpacity = 0,
  slotCount = 3,
) => {
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  if (slot.photoSrc) {
    context.fillStyle = "#111";
    context.fillRect(x, y, w, h);
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
      const shiftY = h * TK_PHOTO_SHIFT;
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
  } else {
    paintEmptyPoster(context, x, y, w, h, scale);
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
          cacheKey: `${team.logoSrc}-tk-cover-mark`,
          fitX: 0.9,
          fitY: 0.9,
          shadow: 0,
        },
      );
      context.restore();
    }
  }

  if (slot.playerId || takeawaysCardName(slot)) {
    const metrics = coverNameMetrics(slotCount);
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
  boardH = GRAPHIC_HEIGHT,
) => {
  const s = scale;
  const size = SCC_SWIPE_SIZE * s;
  const cx = width - SCC_SWIPE_INSET * s - size / 2;
  const cy = boardH * 0.56 * s;
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
  context.moveTo(-arm, -arm);
  context.lineTo(arm, -arm);
  context.lineTo(arm, arm);
  context.stroke();
  context.restore();
};

const paintLockup = (
  context: CanvasRenderingContext2D,
  input: TakeawaysRenderInput,
  width: number,
  scale: number,
) => {
  const s = scale;
  const goldOn = input.showGold !== false;
  const lines = splitTakeawaysTitle(input.title, input.titleStyle);
  const cx = width / 2;
  let cursor = TK_LOCKUP_TOP * s;
  context.textAlign = "center";
  context.textBaseline = "top";
  if (input.titleStyle === "plate") {
    context.font = `900 ${48 * s}px ${POSTER_FONT}`;
    const text = lines[0] ?? "NBA TAKEAWAYS";
    const plateW = Math.min(
      920 * s,
      Math.max(420 * s, context.measureText(text).width + 56 * s),
    );
    const plateH = 86 * s;
    const plateX = cx - plateW / 2;
    context.fillStyle = "#1c1c1c";
    context.fillRect(plateX, cursor, plateW, plateH);
    context.lineWidth = 3 * s;
    context.strokeStyle = "#fff";
    context.strokeRect(plateX, cursor, plateW, plateH);
    context.fillStyle = "#fff";
    context.textBaseline = "middle";
    context.fillText(text, cx, cursor + plateH / 2, plateW - 40 * s);
    cursor += plateH + 18 * s;
  } else {
    context.font = `900 ${TK_TITLE_SIZE * s}px ${POSTER_FONT}`;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex]!;
      const tracking =
        lines.length > 1 && lineIndex === 0
          ? TK_TITLE_LEAD_TRACK
          : TK_TITLE_TRACK;
      setLetterSpacing(context, tracking * TK_TITLE_SIZE * s);
      context.save();
      context.shadowColor = "rgba(250, 204, 21, 0.45)";
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
      context.shadowBlur = 18 * s;
      strokeFillText(
        context,
        line,
        cx,
        cursor,
        goldOn ? "#fde68a" : "#fff",
        "#000",
        4 * s,
        width - 200 * s,
      );
      context.restore();
      withShadow(context, s, () => {
        strokeFillText(
          context,
          line,
          cx,
          cursor,
          goldOn ? "#fde68a" : "#fff",
          "#000",
          4 * s,
          width - 200 * s,
        );
      });
      cursor += TK_TITLE_SIZE * 0.84 * s;
    }
    setLetterSpacing(context, 0);
    cursor += 14 * s;
  }
  const date = takeawaysWeekPill(input).toUpperCase();
  if (date) {
    context.font = `900 ${TK_DATE_SIZE * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, SCC_DATE_TRACK * TK_DATE_SIZE * s);
    const pillW = Math.max(
      168 * s,
      context.measureText(date).width + TK_PILL_PAD_X * 2 * s,
    );
    const pillH = TK_PILL_H * s;
    const pillX = cx - pillW / 2;
    context.beginPath();
    const r = pillH / 2;
    context.moveTo(pillX + r, cursor);
    context.arcTo(pillX + pillW, cursor, pillX + pillW, cursor + pillH, r);
    context.arcTo(pillX + pillW, cursor + pillH, pillX, cursor + pillH, r);
    context.arcTo(pillX, cursor + pillH, pillX, cursor, r);
    context.arcTo(pillX, cursor, pillX + pillW, cursor, r);
    context.closePath();
    context.fillStyle = goldOn ? SCC_GOLD : "#fff";
    context.fill();
    context.lineWidth = 2.5 * s;
    context.strokeStyle = goldOn ? "#fde68a" : "#fff";
    context.stroke();
    context.fillStyle = "#111";
    context.textBaseline = "middle";
    context.fillText(date, cx, cursor + pillH / 2);
    setLetterSpacing(context, 0);
    cursor += pillH + 16 * s;
  }
  if (input.showRangeUnderPip && input.rangeLine) {
    context.font = `900 ${14 * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.22 * 14 * s);
    context.fillStyle = "rgba(255,255,255,0.82)";
    context.textBaseline = "top";
    context.fillText(input.rangeLine.toUpperCase(), cx, cursor);
    setLetterSpacing(context, 0);
  }
};

export type TakeawaysRenderInput = TakeawaysDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
};

export const renderTakeawaysCoverCanvas = async (
  input: TakeawaysRenderInput,
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
  await Promise.all([
    document.fonts?.load(`900 ${TK_TITLE_SIZE * scale}px ${POSTER_FONT}`),
    document.fonts?.load(`900 ${TK_DATE_SIZE * scale}px ${POSTER_FONT}`),
  ]).catch(() => undefined);

  const s = scale;
  context.fillStyle = "#050505";
  context.fillRect(0, 0, width, height);
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const slots = takeawaysCoverViewCards(input, true);
  const slotCount = slots.length;
  const watermark = parseComposerWatermark(input.watermark);
  const watermarkOpacity = gradedWatermarkOpacity(
    composerWatermarkOpacity(watermark),
    input.photoGrade,
  );

  if (slotCount === 0) {
    if (input.coverField === "metal") {
      const metal = await loadCorsImage("/composer-background-texture.png");
      paintBoardField(context, metal, width, height);
    } else {
      paintEmptyPoster(context, 0, 0, width, height, s, "PICK PLAYERS");
    }
  } else {
    for (let index = 0; index < slotCount; index += 1) {
      const slot = slots[index]!;
      const cell = cellRect(index, slotCount, boardH);
      await drawCellPhoto(
        context,
        slot,
        cell.x * s,
        cell.y * s,
        cell.w * s,
        cell.h * s,
        s,
        input.photoGrade === true,
        watermarkOpacity,
        slotCount,
      );
    }
  }

  const goldOn = input.showGold !== false;
  if (slotCount >= 2) {
    for (const seamX of coverSeamXs(slotCount)) {
      paintSeam(
        context,
        (seamX - TK_SEAM_W / 2) * s,
        height,
        TK_SEAM_W * s,
        s,
        goldOn,
      );
    }
  }
  paintTopFade(context, width, TK_FADE_H * s);
  const scrim = context.createRadialGradient(
    width / 2,
    120 * s,
    16 * s,
    width / 2,
    120 * s,
    720 * s,
  );
  scrim.addColorStop(0, "rgba(0, 0, 0, 0.72)");
  scrim.addColorStop(0.56, "rgba(0, 0, 0, 0.28)");
  scrim.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = scrim;
  context.fillRect(0, 0, width, TK_LOCKUP_SCRIM_H * s);

  paintLockup(context, input, width, s);
  drawSwipeCue(context, s, width, goldOn, boardH);
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
