import {
  clipToInnerFrame,
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
  PHOTO_GRADE_FILTER,
  applyPhotoGrade,
  gradedWatermarkOpacity,
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
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  SCC_BA_INSET,
  SCC_BA_SIZE,
  SCC_BRAND_SIZE,
  SCC_BRAND_TRACK,
  SCC_DATE_SIZE,
  SCC_DATE_TRACK,
  SCC_FAMILY_SIZE,
  SCC_GIVEN_SIZE,
  SCC_MAST_H,
  SCC_MARK,
  SCC_NAME_H,
  SCC_NAME_LOGO,
  SCC_SLOT_COUNT,
  SCC_TITLE_SIZE,
  SCC_TITLE_TRACK,
  coverCellRect,
} from "./statCardCoverLayout";
import {
  coverSlotName,
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

const drawCellPhoto = async (
  context: CanvasRenderingContext2D,
  slot: CoverSlot,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  look?: ComposerLook | null,
  photoGrade = false,
  watermarkOpacity = 0,
) => {
  context.save();
  context.fillStyle = "#111";
  context.fillRect(x, y, w, h);
  const inner = clipToInnerFrame(context, x, y, w, h, scale, look);
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
      context.save();
      if (photoGrade) {
        context.filter = PHOTO_GRADE_FILTER;
      }
      if (rotate) {
        context.translate(inner.x + inner.w / 2, inner.y + inner.h / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - (inner.x + inner.w / 2),
          dest.dy - (inner.y + inner.h / 2),
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      context.restore();
      applyPhotoGrade(context, inner.x, inner.y, inner.w, inner.h, photoGrade);
      paintPhotoVignette(context, inner.x, inner.y, inner.w, inner.h, photoGrade);
    }
  }
  context.restore();
  paintCellFrame(context, x, y, w, h, look, scale);

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
        y + h * 0.38 - size / 2,
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
    const line = inner.x - x;
    const barH = Math.max(line, SCC_NAME_H * scale - line);
    const logo = team ? await loadImage(team.logoSrc) : null;
    drawPlayerNameFade(context, {
      x: inner.x,
      y: y + h - line - barH,
      w: inner.w,
      h: barH,
      given: slot.firstName,
      family: slot.lastName,
      logo,
      logoSrc: team?.logoSrc,
      logoSize: SCC_NAME_LOGO * scale,
      familySize: SCC_FAMILY_SIZE * scale,
      givenSize: SCC_GIVEN_SIZE * scale,
      scale,
    });
  }
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

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);
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
      cell.x * s,
      cell.y * s,
      cell.w * s,
      cell.h * s,
      s,
      input.look,
      input.photoGrade === true,
      watermarkOpacity,
    );
  }

  const cx = width / 2;
  const mastMid = (SCC_MAST_H * s) / 2;
  withShadow(context, s, () => {
    context.font = `900 ${SCC_BRAND_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, SCC_BRAND_TRACK * SCC_BRAND_SIZE * s);
    context.fillStyle = "#fff";
    context.fillText(
      (input.brand || "BALLACADEMY").toUpperCase(),
      cx,
      mastMid - 52 * s,
      width - 220 * s,
    );
    setLetterSpacing(context, 0);
  });
  withShadow(context, s, () => {
    context.font = `900 ${SCC_TITLE_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, SCC_TITLE_TRACK * SCC_TITLE_SIZE * s);
    context.fillStyle = "#fff";
    context.fillText(
      (input.title || "STANDOUTS").toUpperCase(),
      cx,
      mastMid + 6 * s,
      width - 220 * s,
    );
    setLetterSpacing(context, 0);
  });
  withShadow(context, s, () => {
    context.font = `900 ${SCC_DATE_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, SCC_DATE_TRACK * SCC_DATE_SIZE * s);
    context.fillStyle = "rgba(255, 255, 255, 0.88)";
    context.fillText(
      (input.dateLine || "").toUpperCase(),
      cx,
      mastMid + 68 * s,
      width - 220 * s,
    );
    setLetterSpacing(context, 0);
  });

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
