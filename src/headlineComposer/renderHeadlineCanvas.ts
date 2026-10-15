import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
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
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
  HL_BODY_LINE,
  HL_BODY_SIZE,
  HL_BODY_TRACK,
  HL_FAMILY_TRACK,
  HL_HEADLINE_TRACK,
  HL_NAME_TRACK,
  headlinePanelHex,
  headlineSplitLayout,
  type HeadlineSubjectMode,
} from "./headlineLayout";
import {
  headlineLabel,
  splitTeamWordmark,
  type HeadlineDraft,
} from "./headlineState";

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

const chevronPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rise: number,
) => {
  context.beginPath();
  context.moveTo(x, y + h / 2);
  context.lineTo(x + rise, y);
  context.lineTo(x + w, y);
  context.lineTo(x + w, y + h);
  context.lineTo(x + rise, y + h);
  context.closePath();
};

export interface HeadlineRenderInput {
  headline: string;
  body: string;
  teamId: string | null;
  firstName?: string;
  lastName?: string;
  photoSrc: string | null;
  pan: HeadlineDraft["pan"];
  subjectMode?: HeadlineSubjectMode;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  story?: boolean;
}

export const renderHeadlineCanvas = async (
  input: HeadlineRenderInput,
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

  const headline = headlineLabel(input.headline);
  const team = getTeam(input.teamId);
  const marks = splitTeamWordmark(team);
  const layout = headlineSplitLayout({
    headline,
    body: input.body,
    firstName: input.firstName ?? "",
    lastName: input.lastName ?? "",
    city: marks.city,
    nick: marks.nick,
    boardH,
    showBa: input.showBa !== false,
  });

  await document.fonts?.ready.catch(() => undefined);
  await Promise.all([
    document.fonts?.load(
      `italic 900 ${layout.kicker.size * scale}px ${POSTER_FONT}`,
    ),
    document.fonts?.load(`900 ${HL_BODY_SIZE * scale}px ${POSTER_FONT}`),
    document.fonts?.load(
      `900 ${Math.max(layout.family.size, 1) * scale}px ${POSTER_FONT}`,
    ),
  ]).catch(() => undefined);

  const s = scale;
  context.fillStyle = "#0b0b0b";
  context.fillRect(0, 0, width, height);

  const photoW = layout.photo.w * s;
  const photoH = layout.photo.h * s;
  if (input.photoSrc) {
    const photo = input.photoSrc.startsWith("data:")
      ? await loadImage(input.photoSrc)
      : await loadCorsImage(input.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        0,
        0,
        photoW,
        photoH,
        input.pan.x,
        input.pan.y,
        photoZoom(input.pan),
      );
      const rotate = photoRotate(input.pan);
      context.save();
      context.beginPath();
      context.rect(0, 0, photoW, photoH);
      context.clip();
      if (input.photoGrade) {
        context.filter = PHOTO_GRADE_FILTER;
      }
      if (rotate) {
        context.translate(photoW / 2, photoH / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - photoW / 2,
          dest.dy - photoH / 2,
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      context.restore();
      applyPhotoGrade(context, 0, 0, photoW, photoH, input.photoGrade);
      paintPhotoVignette(context, 0, 0, photoW, photoH, input.photoGrade);
    }
  }

  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const panelFill = headlinePanelHex(input.teamId);
  context.fillStyle = panelFill;
  context.fillRect(layout.panel.x * s, 0, layout.panel.w * s, height);
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.42)";
  context.shadowBlur = 28 * s;
  context.shadowOffsetX = -14 * s;
  context.fillRect(layout.panel.x * s, 0, 2 * s, height);
  context.restore();

  if (team) {
    const logo = await loadImage(team.logoSrc);
    if (logo) {
      context.save();
      context.beginPath();
      context.rect(layout.panel.x * s, 0, layout.panel.w * s, height);
      context.clip();
      drawCenteredLogo(
        context,
        logo,
        layout.logo.x * s,
        layout.logo.y * s,
        layout.logo.size * s,
        layout.logo.size * s,
        {
          cacheKey: `${team.logoSrc}-headline-hero`,
          fitX: 0.94,
          fitY: 0.9,
          shadow: 22 * s,
        },
      );
      context.restore();
    }
  }

  const chevX = layout.chevron.x * s;
  const chevY = layout.chevron.y * s;
  const chevW = layout.chevron.w * s;
  const chevH = layout.chevron.h * s;
  const rise = layout.chevron.rise * s;
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = 10 * s;
  context.shadowOffsetY = 5 * s;
  chevronPath(context, chevX, chevY, chevW, chevH, rise);
  const silver = context.createLinearGradient(0, chevY, 0, chevY + chevH);
  silver.addColorStop(0, "#6d757c");
  silver.addColorStop(0.16, "#c2c9d0");
  silver.addColorStop(0.4, "#eef2f5");
  silver.addColorStop(0.52, "#f8fafc");
  silver.addColorStop(0.8, "#c5ccd3");
  silver.addColorStop(1, "#7a828a");
  context.fillStyle = silver;
  context.fill();
  context.restore();

  context.font = `italic 900 ${layout.kicker.size * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, HL_HEADLINE_TRACK * layout.kicker.size * s);
  context.fillStyle = "#111111";
  const kickerCx = (layout.kicker.x + layout.kicker.w / 2) * s;
  const kickerLine = layout.kicker.size * s;
  const kickerBlock = layout.kicker.lines.length * kickerLine;
  let kickerTy = chevY + chevH / 2 - kickerBlock / 2 + kickerLine / 2;
  layout.kicker.lines.forEach((line) => {
    if (line) {
      context.fillText(line, kickerCx, kickerTy, layout.kicker.w * s);
    }
    kickerTy += kickerLine;
  });
  setLetterSpacing(context, 0);

  const paintStack = (
    text: string,
    size: number,
    tracking: number,
    x: number,
    y: number,
    baseline: CanvasTextBaseline,
  ) => {
    if (!text || size <= 0) {
      return;
    }
    context.font = `900 ${size * s}px ${POSTER_FONT}`;
    context.textAlign = "left";
    context.textBaseline = baseline;
    setLetterSpacing(context, tracking * size * s);
    context.shadowColor = "rgba(0, 0, 0, 0.4)";
    context.shadowBlur = 8 * s;
    context.shadowOffsetY = 2 * s;
    context.fillStyle = "#ffffff";
    context.fillText(text, x * s, y * s, layout.given.w * s);
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    setLetterSpacing(context, 0);
  };

  paintStack(
    layout.given.text,
    layout.given.size,
    HL_NAME_TRACK,
    layout.given.x,
    layout.given.y,
    "top",
  );
  paintStack(
    layout.family.text,
    layout.family.size,
    HL_FAMILY_TRACK,
    layout.family.x,
    layout.family.y,
    "top",
  );

  context.font = `900 ${HL_BODY_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "top";
  setLetterSpacing(context, HL_BODY_TRACK * HL_BODY_SIZE * s);
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(0, 0, 0, 0.4)";
  context.shadowBlur = 8 * s;
  context.shadowOffsetY = 2 * s;
  layout.body.lines.forEach((line, index) => {
    const y = layout.body.y * s + index * HL_BODY_SIZE * HL_BODY_LINE * s;
    context.fillText(line, layout.body.x * s, y, layout.body.w * s);
  });
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  setLetterSpacing(context, 0);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = layout.ba.w * s;
      const insetX = layout.ba.x * s;
      const insetY = layout.ba.y * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, insetX, insetY, size);
      }
      context.drawImage(ba, insetX, insetY, size, size);
    }
  }

  paintCellFrame(context, 0, 0, width, height, input.look, s);

  return canvas;
};
