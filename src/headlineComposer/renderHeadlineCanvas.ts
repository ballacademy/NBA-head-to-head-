import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
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
  HL_BA_INSET,
  HL_BA_SIZE,
  HL_BODY_LINE,
  HL_BODY_SIZE,
  HL_BODY_TRACK,
  HL_CITY_SIZE,
  HL_FADE_H,
  HL_HEADLINE_H,
  HL_HEADLINE_PAD_X,
  HL_HEADLINE_SIZE,
  HL_HEADLINE_TRACK,
  HL_NICK_SIZE,
  HL_PAD_X,
  HL_PLATE_ACCENT,
  HL_PLATE_BODY_GAP,
  HL_PLATE_FILL,
  HL_PLATE_ROTATE,
  HL_TORN_POINTS,
  HL_WORDMARK_LINE,
  HL_WORDMARK_TRACK,
  headlineTypeStack,
  headlineWatermarkBox,
  parseHeadlineWatermark,
  type HeadlineWatermark,
} from "./headlineLayout";
import {
  headlineBodyLines,
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

const wrapLines = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) => {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const lines: string[] = [];
  let current = words[0]!;
  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]!}`;
    if (context.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[index]!;
      if (lines.length === maxLines - 1) {
        const rest = [current, ...words.slice(index + 1)].join(" ");
        lines.push(rest);
        return lines;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
};

const bodyPaintLines = (
  context: CanvasRenderingContext2D,
  body: string,
  maxWidth: number,
) => {
  const raw = headlineBodyLines(body);
  if (raw.length === 0) {
    return [];
  }
  const lines: string[] = [];
  raw.forEach((line) => {
    const wrapped = wrapLines(context, line, maxWidth, 2);
    wrapped.forEach((part) => lines.push(part));
  });
  return lines.slice(0, 3);
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

const tornPlatePath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  context.beginPath();
  HL_TORN_POINTS.forEach(([px, py], index) => {
    const X = x + px * w;
    const Y = y + py * h;
    if (index === 0) {
      context.moveTo(X, Y);
    } else {
      context.lineTo(X, Y);
    }
  });
  context.closePath();
};

export interface HeadlineRenderInput {
  headline: string;
  body: string;
  teamId: string | null;
  photoSrc: string | null;
  pan: HeadlineDraft["pan"];
  watermark?: HeadlineWatermark;
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
}

export const renderHeadlineCanvas = async (
  input: HeadlineRenderInput,
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
    document.fonts?.load(`italic 900 ${HL_HEADLINE_SIZE * scale}px ${POSTER_FONT}`),
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
      if (rotate) {
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - width / 2,
          dest.dy - height / 2,
          dest.dw,
          dest.dh,
        );
        context.restore();
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      paintPhotoVignette(context, 0, 0, width, height);
    }
  }

  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const fade = context.createLinearGradient(
    0,
    height - HL_FADE_H * s,
    0,
    height,
  );
  fade.addColorStop(0, "rgba(6, 6, 8, 0)");
  fade.addColorStop(0.42, "rgba(6, 6, 8, 0.68)");
  fade.addColorStop(1, "rgba(6, 6, 8, 0.94)");
  context.fillStyle = fade;
  context.fillRect(0, height - HL_FADE_H * s, width, HL_FADE_H * s);

  paintCellFrame(context, 0, 0, width, height, input.look, s);

  const plateW = width - HL_PAD_X * 2 * s;
  const plateH = HL_HEADLINE_H * s;
  const plateX = HL_PAD_X * s;
  context.font = `900 ${HL_BODY_SIZE * s}px ${POSTER_FONT}`;
  setLetterSpacing(context, HL_BODY_TRACK * HL_BODY_SIZE * s);
  const bodyLines = bodyPaintLines(context, input.body, plateW);
  setLetterSpacing(context, 0);
  const team = getTeam(input.teamId);
  const stack = headlineTypeStack(bodyLines.length, Boolean(team));
  const plateY = stack.plateTop * s;
  const mode = parseHeadlineWatermark(input.watermark);

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

  const marks = splitTeamWordmark(team);
  const paintWordmark = (text: string, size: number, top: number) => {
    if (!text) {
      return;
    }
    context.font = `900 ${size * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, HL_WORDMARK_TRACK * size * s);
    context.lineJoin = "round";
    context.miterLimit = 2;
    context.strokeStyle = "#0a0a0a";
    context.lineWidth = 4 * s;
    context.strokeText(
      text,
      width / 2,
      (top + (size * HL_WORDMARK_LINE) / 2) * s,
    );
    context.fillStyle = "#fff";
    context.fillText(
      text,
      width / 2,
      (top + (size * HL_WORDMARK_LINE) / 2) * s,
    );
    setLetterSpacing(context, 0);
  };
  paintWordmark(marks.city, HL_CITY_SIZE, stack.cityTop);
  paintWordmark(marks.nick, HL_NICK_SIZE, stack.nickTop);

  const cx = plateX + plateW / 2;
  const cy = plateY + plateH / 2;
  context.save();
  context.translate(cx, cy);
  context.rotate((HL_PLATE_ROTATE * Math.PI) / 180);
  context.translate(-cx, -cy);
  tornPlatePath(context, plateX, plateY, plateW, plateH);
  context.fillStyle = HL_PLATE_FILL;
  context.fill();
  if (team) {
    context.save();
    tornPlatePath(context, plateX, plateY, plateW, plateH);
    context.clip();
    context.fillStyle = getTeamColors(team.id).primary;
    context.fillRect(
      plateX,
      plateY + plateH - HL_PLATE_ACCENT * s,
      plateW,
      HL_PLATE_ACCENT * s,
    );
    context.restore();
  }
  tornPlatePath(context, plateX, plateY, plateW, plateH);
  context.strokeStyle = "#fff";
  context.lineWidth = 2.2 * s;
  context.lineJoin = "round";
  context.stroke();
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, plateX, plateY, plateW, plateH, s);
  }
  const headline = headlineLabel(input.headline);
  context.font = `italic 900 ${HL_HEADLINE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, HL_HEADLINE_TRACK * HL_HEADLINE_SIZE * s);
  context.fillStyle = "#fff";
  context.fillText(
    headline,
    cx,
    cy - 2 * s,
    plateW - HL_HEADLINE_PAD_X * 2 * s,
  );
  setLetterSpacing(context, 0);
  context.restore();

  context.font = `900 ${HL_BODY_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, HL_BODY_TRACK * HL_BODY_SIZE * s);
  bodyLines.forEach((line, index) => {
    const y =
      stack.nickBottom * s +
      HL_PLATE_BODY_GAP * s +
      (index + 0.5) * HL_BODY_SIZE * HL_BODY_LINE * s;
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
