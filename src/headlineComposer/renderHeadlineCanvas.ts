import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
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
  HL_BA_INSET,
  HL_BA_SIZE,
  HL_BODY_LINE,
  HL_BODY_SIZE,
  HL_BODY_TRACK,
  HL_FADE_H,
  HL_HEADLINE_PAD_X,
  HL_HEADLINE_TRACK,
  HL_KICKER_SIZE,
  HL_NAME_SIZE,
  HL_OPP_MARK,
  HL_PAD_X,
  HL_PLATE_SKEW,
  HL_WORDMARK_TRACK,
  fitHeadlineType,
  headlineDateKicker,
  headlinePlateHeight,
  headlineTypeStack,
  headlineWatermarkBox,
  parseHeadlineKickerMode,
  parseHeadlineLockup,
  parseHeadlineNamePlacement,
  parseHeadlinePlateColor,
  parseHeadlineWatermark,
  plateFillHex,
  plateInkHex,
  type HeadlineKickerMode,
  type HeadlineLockup,
  type HeadlineNamePlacement,
  type HeadlinePlateColor,
  type HeadlineSubjectMode,
  type HeadlineWatermark,
} from "./headlineLayout";
import {
  headlineBodyLines,
  headlineLabel,
  headlinePlayerName,
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
  if (strokeWidth > 0) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.strokeText(text, x, y);
  }
  context.fillStyle = fill;
  context.fillText(text, x, y);
};

const parallelogramPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  skew: number,
) => {
  context.beginPath();
  context.moveTo(x + skew, y);
  context.lineTo(x + w - skew, y);
  context.lineTo(x + w, y + h);
  context.lineTo(x, y + h);
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
  watermark?: HeadlineWatermark;
  plateColor?: HeadlinePlateColor;
  lockup?: HeadlineLockup;
  namePlacement?: HeadlineNamePlacement;
  showOpponentMark?: boolean;
  kickerMode?: HeadlineKickerMode;
  subjectMode?: HeadlineSubjectMode;
  opponentId?: string | null;
  gameDate?: string | null;
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
  const fit = fitHeadlineType(headline);
  const names = parseHeadlineNamePlacement(input.namePlacement);
  const place = parseHeadlineLockup(input.lockup);
  const kicker = parseHeadlineKickerMode(input.kickerMode);
  const plate = parseHeadlinePlateColor(input.plateColor);
  const mode = parseHeadlineWatermark(input.watermark);
  const playerName = headlinePlayerName({
    firstName: input.firstName ?? "",
    lastName: input.lastName ?? "",
  });
  const kickerText = headlineDateKicker(input.gameDate, kicker);
  const plateHFit = headlinePlateHeight(
    fit,
    names === "plate" && Boolean(playerName),
  );
  const bodyLines = headlineBodyLines(input.body);

  await document.fonts?.ready.catch(() => undefined);
  await Promise.all([
    document.fonts?.load(`italic 900 ${fit.size * scale}px ${POSTER_FONT}`),
    document.fonts?.load(`900 ${HL_BODY_SIZE * scale}px ${POSTER_FONT}`),
  ]).catch(() => undefined);

  const s = scale;
  context.fillStyle = "#0b0b0b";
  context.fillRect(0, 0, width, height);

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
        width,
        height,
        input.pan.x,
        input.pan.y,
        photoZoom(input.pan),
      );
      const rotate = photoRotate(input.pan);
      context.save();
      if (input.photoGrade) {
        context.filter = PHOTO_GRADE_FILTER;
      }
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
      applyPhotoGrade(context, 0, 0, width, height, input.photoGrade);
      paintPhotoVignette(context, 0, 0, width, height, input.photoGrade);
    }
  }

  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const marks = splitTeamWordmark(getTeam(input.teamId));
  const stack = headlineTypeStack({
    bodyLines: Math.max(bodyLines.length, 1),
    plateH: plateHFit,
    lockup: place,
    kicker: Boolean(kickerText),
    nameUnder: names === "under" && Boolean(playerName),
    city: marks.city,
    nick: marks.nick,
    boardH,
  });

  if (stack.fadeAt === "top") {
    const fade = context.createLinearGradient(0, 0, 0, HL_FADE_H * s);
    fade.addColorStop(0, "rgba(6, 6, 8, 0.78)");
    fade.addColorStop(0.48, "rgba(6, 6, 8, 0.42)");
    fade.addColorStop(1, "rgba(6, 6, 8, 0)");
    context.fillStyle = fade;
    context.fillRect(0, 0, width, HL_FADE_H * s);
  } else {
    const fade = context.createLinearGradient(
      0,
      height - HL_FADE_H * s,
      0,
      height,
    );
    fade.addColorStop(0, "rgba(6, 6, 8, 0)");
    fade.addColorStop(0.52, "rgba(6, 6, 8, 0.42)");
    fade.addColorStop(1, "rgba(6, 6, 8, 0.78)");
    context.fillStyle = fade;
    context.fillRect(0, height - HL_FADE_H * s, width, HL_FADE_H * s);
  }

  paintCellFrame(context, 0, 0, width, height, input.look, s);

  const team = getTeam(input.teamId);
  const opponent = getTeam(input.opponentId);
  const teamColor = input.teamId ? getTeamColors(input.teamId).primary : "#ffffff";
  const fill = plateFillHex(plate, teamColor);
  const ink = plateInkHex(fill);

  if (team && mode !== "off") {
    const logo = await loadImage(team.logoSrc);
    if (logo) {
      const box = headlineWatermarkBox(mode, stack);
      context.save();
      context.globalAlpha = box.opacity;
      drawCenteredLogo(
        context,
        logo,
        box.x * s,
        box.y * s,
        box.size * s,
        box.size * s,
        {
          cacheKey: `${team.logoSrc}-headline-mark-${mode}`,
          fitX: 0.92,
          fitY: 0.92,
          shadow: 0,
        },
      );
      context.restore();
    }
  }

  const paintWordmark = (
    text: string,
    size: number,
    baseline: "top" | "bottom",
    y: number,
  ) => {
    if (!text || size <= 0) {
      return;
    }
    context.font = `900 ${size * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = baseline;
    setLetterSpacing(context, HL_WORDMARK_TRACK * size * s);
    context.lineJoin = "round";
    context.miterLimit = 2;
    context.strokeStyle = "#0a0a0a";
    context.lineWidth = 3.2 * s;
    context.strokeText(text, width / 2, y * s);
    context.fillStyle = "#fff";
    context.fillText(text, width / 2, y * s);
    setLetterSpacing(context, 0);
  };
  paintWordmark(marks.city, stack.citySize, "top", stack.cityTop);
  paintWordmark(marks.nick, stack.nickSize, "bottom", stack.nickBottom);

  const plateW = width - HL_PAD_X * 2 * s;
  const plateH = plateHFit * s;
  const plateX = HL_PAD_X * s;
  const plateY = stack.plateTop * s;
  const cx = plateX + plateW / 2;
  const cy = plateY + plateH / 2;
  parallelogramPath(context, plateX, plateY, plateW, plateH, HL_PLATE_SKEW * s);
  context.lineJoin = "miter";
  context.strokeStyle = "#111";
  context.lineWidth = 16 * s;
  context.stroke();
  parallelogramPath(context, plateX, plateY, plateW, plateH, HL_PLATE_SKEW * s);
  context.strokeStyle = "#fff";
  context.lineWidth = 6 * s;
  context.stroke();
  parallelogramPath(context, plateX, plateY, plateW, plateH, HL_PLATE_SKEW * s);
  context.fillStyle = fill;
  context.fill();
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, plateX, plateY, plateW, plateH, s);
  }
  const lineH = fit.size * 1.05 * s;
  const nameGap = names === "plate" && playerName ? (HL_NAME_SIZE + 8) * s : 0;
  const typeBlock = fit.lines.length * lineH + nameGap;
  let ty = cy - typeBlock / 2 + lineH / 2;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `italic 900 ${fit.size * s}px ${POSTER_FONT}`;
  setLetterSpacing(context, HL_HEADLINE_TRACK * fit.size * s);
  context.fillStyle = ink;
  const maxType = plateW - HL_HEADLINE_PAD_X * 2 * s;
  fit.lines.forEach((line) => {
    context.fillText(line, cx, ty, maxType);
    ty += lineH;
  });
  setLetterSpacing(context, 0);
  if (names === "plate" && playerName) {
    context.font = `900 ${HL_NAME_SIZE * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.14 * HL_NAME_SIZE * s);
    context.globalAlpha = 0.78;
    context.fillStyle = ink;
    context.fillText(playerName.toUpperCase(), cx, ty - lineH / 2 + 12 * s);
    context.globalAlpha = 1;
    setLetterSpacing(context, 0);
  }

  if (kickerText) {
    context.font = `900 ${HL_KICKER_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "top";
    setLetterSpacing(context, 0.18 * HL_KICKER_SIZE * s);
    strokeFillText(
      context,
      kickerText,
      width / 2,
      stack.kickerTop * s,
      "#fff",
      "#000",
      2 * s,
    );
    setLetterSpacing(context, 0);
  }

  if (names === "under" && playerName) {
    context.font = `900 ${HL_NAME_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "top";
    setLetterSpacing(context, 0.14 * HL_NAME_SIZE * s);
    strokeFillText(
      context,
      playerName.toUpperCase(),
      width / 2,
      stack.nameTop * s,
      "#fff",
      "#000",
      2 * s,
    );
    setLetterSpacing(context, 0);
  }

  context.font = `900 ${HL_BODY_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, HL_BODY_TRACK * HL_BODY_SIZE * s);
  if (input.showOpponentMark && opponent && bodyLines[0]) {
    const logo = await loadImage(opponent.logoSrc);
    if (logo) {
      const mark = HL_OPP_MARK * s;
      const firstWidth = context.measureText(bodyLines[0]).width;
      drawCenteredLogo(
        context,
        logo,
        width / 2 - firstWidth / 2 - mark - 10 * s,
        stack.bodyTop * s,
        mark,
        mark,
        {
          cacheKey: `${opponent.logoSrc}-headline-opp`,
          fitX: 0.92,
          fitY: 0.92,
          shadow: 0,
        },
      );
    }
  }
  bodyLines.forEach((line, index) => {
    const y =
      stack.bodyTop * s + (index + 0.5) * HL_BODY_SIZE * HL_BODY_LINE * s;
    strokeFillText(context, line, width / 2, y, "#fff", "#000", 2.4 * s);
  });
  setLetterSpacing(context, 0);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = HL_BA_SIZE * s;
      const inset = HL_BA_INSET * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, inset, inset, size);
      }
      context.drawImage(ba, inset, inset, size, size);
    }
  }

  return canvas;
};
