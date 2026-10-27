import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { applyPhotoGrade, canvasGradeFilter } from "../instagramComposer/photoGrade";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { paintBoardField } from "../standingsComposer/headerTexture";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { renderStatCardCoverCanvas } from "../statCardCoverComposer/renderStatCardCoverCanvas";
import {
  SCC_BA_INSET,
  SCC_BA_SIZE,
  SCC_DATE_SIZE,
  SCC_DATE_TRACK,
  SCC_GOLD,
  SCC_GOLD_DEEP,
  SCC_LOCKUP_TOP,
  SCC_PILL_H,
  SCC_PILL_PAD_X,
  SCC_SWIPE_CHEV,
  SCC_SWIPE_INSET,
  SCC_SWIPE_LABEL,
  SCC_SWIPE_SIZE,
  SCC_SWIPE_STROKE,
  SCC_TITLE_LEAD_TRACK,
  SCC_TITLE_SIZE,
  SCC_TITLE_TRACK,
} from "../statCardCoverComposer/statCardCoverLayout";
import type { CoverSlot } from "../statCardCoverComposer/statCardCoverState";
import {
  splitTakeawaysTitle,
  takeawaysCoverViewCards,
  takeawaysWeekPill,
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
  let cursor = SCC_LOCKUP_TOP * s;
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
    context.font = `900 ${SCC_TITLE_SIZE * s}px ${POSTER_FONT}`;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex]!;
      const tracking =
        lines.length > 1 && lineIndex === 0
          ? SCC_TITLE_LEAD_TRACK
          : SCC_TITLE_TRACK;
      setLetterSpacing(context, tracking * SCC_TITLE_SIZE * s);
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
  }
  const date = takeawaysWeekPill(input).toUpperCase();
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

const toCoverSlots = (input: TakeawaysDraft): CoverSlot[] =>
  takeawaysCoverViewCards(input, true).map((card) => ({
    playerId: card.playerId,
    teamId: card.teamId,
    firstName: card.firstName,
    lastName: card.lastName,
    photoSrc: card.photoSrc,
    customPhoto: card.customPhoto,
    pan: card.pan,
  }));

export const renderTakeawaysCoverCanvas = async (
  input: TakeawaysRenderInput,
  scale = 2,
) => {
  const boardH = input.story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
  const slots = toCoverSlots(input);
  if (slots.length >= 2) {
    const canvas = await renderStatCardCoverCanvas(
      {
        brand: input.brand,
        title: input.title,
        dateLine: takeawaysWeekPill(input),
        gameDate: input.from,
        slots,
        showBa: input.showBa,
        showGold: input.showGold,
        watermark: input.watermark,
        portraitCount: slots.length,
        look: input.look,
        purpleFlair: input.purpleFlair,
        photoGrade: input.photoGrade,
        story: input.story,
      },
      scale,
    );
    if (input.showRangeUnderPip && input.rangeLine) {
      const context = canvas.getContext("2d");
      if (context) {
        const s = scale;
        context.font = `900 ${14 * s}px ${POSTER_FONT}`;
        context.textAlign = "center";
        context.fillStyle = "rgba(255,255,255,0.82)";
        setLetterSpacing(context, 0.22 * 14 * s);
        context.fillText(
          input.rangeLine.toUpperCase(),
          canvas.width / 2,
          (SCC_LOCKUP_TOP + 210) * s,
        );
        setLetterSpacing(context, 0);
      }
    }
    return canvas;
  }

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
  const s = scale;
  context.fillStyle = "#050505";
  context.fillRect(0, 0, width, height);
  const face = slots[0];
  if (face?.photoSrc) {
    const photo = face.photoSrc.startsWith("data:")
      ? await loadImage(face.photoSrc)
      : await loadCorsImage(face.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        0,
        0,
        width,
        height,
        face.pan.x,
        face.pan.y,
        photoZoom(face.pan),
      );
      const rotate = photoRotate(face.pan);
      context.save();
      context.filter = canvasGradeFilter(input.photoGrade === true);
      if (rotate) {
        context.translate(width / 2, height / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - width / 2,
          dest.dy - height / 2,
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      context.restore();
      applyPhotoGrade(context, 0, 0, width, height, input.photoGrade === true);
      paintPhotoVignette(
        context,
        0,
        0,
        width,
        height,
        input.photoGrade === true,
      );
    }
  } else if (input.coverField === "metal") {
    const metal = await loadCorsImage("/composer-background-texture.png");
    paintBoardField(context, metal, width, height);
  } else {
    context.fillStyle = "#050505";
    context.fillRect(0, 0, width, height);
  }
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }
  paintLockup(context, input, width, s);
  drawSwipeCue(context, s, width, input.showGold !== false, boardH);
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
