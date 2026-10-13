import {
  frameColor,
  frameLinePx,
  paintCellFrame,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { drawPlayerNameFade } from "../instagramComposer/drawPlayerNameFade";
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
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PLUS_BA_INSET,
  PLUS_BA_SIZE,
  PLUS_BRAND_SIZE,
  PLUS_NAME_GIVEN_SIZE,
  PLUS_NAME_SIZE,
  PLUS_SECTION_SIZE,
  PLUS_SECTION_TRACK,
  PLUS_STANDOUT_COUNT,
  PLUS_STANDOUT_GIVEN_SIZE,
  PLUS_STANDOUT_NAME_SIZE,
  PLUS_STARTER_COUNT,
  PLUS_TITLE_SIZE,
  PLUS_TITLE_TRACK,
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
  givenSize: number,
  logoSize: number,
  scale: number,
  first: boolean,
  showNames: boolean,
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

  if (!showNames) {
    return;
  }

  const barH = Math.max(line, nameH * scale - line);
  const barY = y + h - line - barH;
  const barX = first ? x + line : x;
  const barW = w - (first ? line : 0) - line;
  const team = getTeam(slot.teamId);
  const logo = team ? await loadImage(team.logoSrc) : null;
  drawPlayerNameFade(context, {
    x: barX,
    y: barY,
    w: barW,
    h: barH,
    given: slot.firstName,
    family: slot.lastName,
    logo,
    logoSrc: team?.logoSrc,
    logoSize: logoSize * scale,
    familySize: nameSize * scale,
    givenSize: givenSize * scale,
    scale,
  });
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

const drawHeadline = (
  context: CanvasRenderingContext2D,
  text: string,
  y: number,
  size: number,
  tracking: number,
  stroke: number,
  scale: number,
  width: number,
) => {
  const label = text.trim().toUpperCase();
  if (!label) {
    return;
  }
  context.font = `900 italic ${size * scale}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, tracking * size * scale);
  withShadow(context, scale, () => {
    strokeFillText(context, label, width / 2, y, "#fff", "#000", stroke * scale);
  });
  setLetterSpacing(context, 0);
};

const drawWeekNotch = (
  context: CanvasRenderingContext2D,
  text: string,
  y: number,
  h: number,
  scale: number,
  width: number,
) => {
  const label = text.trim().toUpperCase();
  if (!label) {
    return;
  }
  context.font = `900 ${PLUS_WEEK_SIZE * scale}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.04 * PLUS_WEEK_SIZE * scale);
  const textW = context.measureText(label).width;
  const pad = 18 * scale;
  const notchW = Math.min(
    width * 0.78,
    Math.max(width * 0.4, textW + pad * 2),
  );
  const x = (width - notchW) / 2;
  const inset = notchW * 0.06;
  context.beginPath();
  context.moveTo(x + inset, y);
  context.lineTo(x + notchW - inset, y);
  context.lineTo(x + notchW, y + h);
  context.lineTo(x, y + h);
  context.closePath();
  context.fillStyle = "#fff";
  context.fill();
  context.fillStyle = "#111";
  context.fillText(label, width / 2, y + h / 2 + 0.5 * scale);
  setLetterSpacing(context, 0);
};

export interface TeamOfTheWeekPlusRenderInput {
  brand: string;
  week: string;
  starterCaption: string;
  standoutCaption: string;
  slots: TotwStrip[];
  look?: ComposerLook;
  showBa?: boolean;
  showNames?: boolean;
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
    ?.load(`900 italic ${PLUS_TITLE_SIZE * scale}px ${POSTER_FONT}`)
    .catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);

  const s = scale;
  const metrics = plusBoardMetrics();

  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = PLUS_BA_SIZE * s;
      const inset = PLUS_BA_INSET * s;
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  } else {
    const brand = (input.brand.trim() || "BALLACADEMY").toUpperCase();
    withShadow(context, s, () => {
      context.font = `900 ${PLUS_BRAND_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      setLetterSpacing(context, 0.16 * PLUS_BRAND_SIZE * s);
      context.fillStyle = "#fff";
      context.fillText(brand, 22 * s, 26 * s);
      setLetterSpacing(context, 0);
    });
  }

  drawHeadline(
    context,
    input.starterCaption || "TEAM OF THE WEEK",
    metrics.titleY * s,
    PLUS_TITLE_SIZE,
    PLUS_TITLE_TRACK,
    3.4,
    s,
    width,
  );
  drawWeekNotch(
    context,
    input.week,
    metrics.weekY * s,
    metrics.weekH * s,
    s,
    width,
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
      PLUS_NAME_GIVEN_SIZE,
      rect.logoSize,
      s,
      index === 0,
      input.showNames !== false,
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

  drawHeadline(
    context,
    input.standoutCaption || "STANDOUTS OF THE WEEK",
    (metrics.sectionY + metrics.sectionH / 2) * s,
    PLUS_SECTION_SIZE,
    PLUS_SECTION_TRACK,
    2.4,
    s,
    width,
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
      PLUS_STANDOUT_GIVEN_SIZE,
      rect.logoSize,
      s,
      index === 0,
      input.showNames !== false,
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
