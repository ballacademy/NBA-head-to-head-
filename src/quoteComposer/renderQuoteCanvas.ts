import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { readComposerNameStyle } from "../instagramComposer/composerNameStyle";
import { getTeamColors } from "../lib/teamColors";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  applyPhotoGrade,
  canvasGradeFilter,
} from "../instagramComposer/photoGrade";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  QT_BA_INSET,
  QT_BA_SIZE,
  QT_FADE_H,
  QT_LAST_TOP,
  QT_LAST_TRACK,
  QT_MARK_SIZE,
  QT_QUOTE_LINE,
  QT_QUOTE_PAD_X,
  QT_QUOTE_TRACK,
  QT_SOURCE_BOTTOM,
  QT_SOURCE_SIZE,
  QT_SOURCE_TRACK,
  formatQuoteSource,
  quoteBottom,
  quoteLastName,
  quoteLastNameSize,
  quoteMaxLines,
  quoteTypeSize,
} from "./quoteLayout";
import { type QuoteDraft } from "./quoteState";

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

const wrapQuote = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) => {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) {
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
        lines.push([current, ...words.slice(index + 1)].join(" "));
        return lines;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
};

export type QuoteRenderInput = QuoteDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
};

export const renderQuoteCanvas = async (
  input: QuoteRenderInput,
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
  const photoOn = input.showHeadshot !== false;
  context.fillStyle = "#0b0b0b";
  context.fillRect(0, 0, width, height);
  if (photoOn && input.photoSrc) {
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
      context.filter = canvasGradeFilter(input.photoGrade);
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

  const fade = context.createLinearGradient(
    0,
    height - QT_FADE_H * s,
    0,
    height,
  );
  fade.addColorStop(0, "rgba(6, 6, 8, 0)");
  fade.addColorStop(0.28, "rgba(6, 6, 8, 0.28)");
  fade.addColorStop(0.62, "rgba(6, 6, 8, 0.82)");
  fade.addColorStop(1, "rgba(6, 6, 8, 0.96)");
  context.fillStyle = fade;
  context.fillRect(0, height - QT_FADE_H * s, width, QT_FADE_H * s);

  const last = quoteLastName(input.attribution, readComposerNameStyle());
  if (last) {
    const size = quoteLastNameSize(last, input.quote);
    context.font = `900 ${size * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "top";
    setLetterSpacing(context, QT_LAST_TRACK * size * s);
    context.lineJoin = "round";
    context.strokeStyle = "#0a0a0a";
    context.lineWidth = 4 * s;
    context.strokeText(last, width / 2, QT_LAST_TOP * s, width - 176 * s);
    context.fillStyle = "#fff";
    context.fillText(last, width / 2, QT_LAST_TOP * s, width - 176 * s);
    setLetterSpacing(context, 0);
  }

  paintCellFrame(context, 0, 0, width, height, input.look, s);

  const source = formatQuoteSource(input.source ?? "");
  const hasSource = Boolean(source);
  const bottom = quoteBottom(hasSource);
  const quoteSize = quoteTypeSize(input.quote);
  const quote = input.quote.replace(/\s+/g, " ").trim().toUpperCase();
  context.font = `900 ${quoteSize * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, QT_QUOTE_TRACK * quoteSize * s);
  const lines = wrapQuote(
    context,
    quote,
    width - QT_QUOTE_PAD_X * 2 * s,
    quoteMaxLines(input.quote),
  );
  const lineH = quoteSize * QT_QUOTE_LINE * s;
  const blockH = Math.max(lines.length, 1) * lineH;
  const quoteBottomY = height - bottom * s;
  const markColor = input.teamId
    ? getTeamColors(input.teamId).primary
    : "#ffffff";
  context.font = `900 ${QT_MARK_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillStyle = markColor;
  context.fillText("“", width / 2, quoteBottomY - blockH - 8 * s);

  context.font = `900 ${quoteSize * s}px ${POSTER_FONT}`;
  context.textBaseline = "middle";
  lines.forEach((line, index) => {
    const y = quoteBottomY - blockH + (index + 0.5) * lineH;
    context.lineJoin = "round";
    context.strokeStyle = "#000";
    context.lineWidth = 3 * s;
    context.strokeText(line, width / 2, y);
    context.fillStyle = "#fff";
    context.fillText(line, width / 2, y);
  });
  setLetterSpacing(context, 0);

  if (hasSource) {
    context.font = `900 ${QT_SOURCE_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, QT_SOURCE_TRACK * QT_SOURCE_SIZE * s);
    context.fillStyle = "rgba(255,255,255,0.82)";
    context.fillText(
      source,
      width / 2,
      height - QT_SOURCE_BOTTOM * s,
      width - 176 * s,
    );
    setLetterSpacing(context, 0);
  }

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = QT_BA_SIZE * s;
      const inset = QT_BA_INSET * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
