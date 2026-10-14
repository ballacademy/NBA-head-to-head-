import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import { photoZoom } from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { type QuoteDraft } from "./quoteState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

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
  paintBoardField(context, await loadImage(FIELD_TEXTURE_SRC), width, height);
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const quote = input.quote.replace(/\s+/g, " ").trim().toUpperCase();
  context.font = `900 ${72 * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const lines = wrapQuote(context, quote, width - 128 * s, 6);
  const lineH = 76 * s;
  const startY = 220 * s + ((860 * s - lines.length * lineH) / 2);
  lines.forEach((line, index) => {
    const y = startY + (index + 0.5) * lineH;
    context.lineJoin = "round";
    context.strokeStyle = "#000";
    context.lineWidth = 3.2 * s;
    context.strokeText(line, width / 2, y);
    context.fillStyle = "#fff";
    context.fillText(line, width / 2, y);
  });

  if (input.showHeadshot && input.photoSrc) {
    const photo = input.photoSrc.startsWith("data:")
      ? await loadImage(input.photoSrc)
      : await loadCorsImage(input.photoSrc);
    const size = 120 * s;
    const x = 64 * s;
    const y = height - 56 * s - size;
    context.save();
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    context.clip();
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        x,
        y,
        size,
        size,
        input.pan.x,
        input.pan.y,
        photoZoom(input.pan),
      );
      context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
    } else {
      context.fillStyle = "#222";
      context.fillRect(x, y, size, size);
    }
    context.restore();
    paintCellFrame(context, x, y, size, size, input.look, s);
  }

  context.font = `900 ${28 * s}px ${POSTER_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  context.fillText(
    input.attribution.trim().toUpperCase(),
    200 * s,
    height - 72 * s,
    width - 280 * s,
  );

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 72 * s;
      const inset = 36 * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
