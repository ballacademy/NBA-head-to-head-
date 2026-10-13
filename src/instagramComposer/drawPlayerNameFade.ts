import { drawCoveredLogo } from "../standingsComposer/logoDraw";
import { wrapNameToWidth } from "./nameFit";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

export const NAME_FADE_STOPS: Array<[number, string]> = [
  [0, "rgba(0, 0, 0, 0)"],
  [0.16, "rgba(0, 0, 0, 0.28)"],
  [0.36, "rgba(0, 0, 0, 0.62)"],
  [0.58, "rgba(0, 0, 0, 0.88)"],
  [0.78, "rgba(0, 0, 0, 0.95)"],
  [1, "rgba(0, 0, 0, 0.98)"],
];

export const paintNameFadeRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const fade = context.createLinearGradient(x, y, x, y + h);
  NAME_FADE_STOPS.forEach(([stop, color]) => fade.addColorStop(stop, color));
  context.fillStyle = fade;
  context.fillRect(x, y, w, h);
};

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

export const drawNameStack = (
  context: CanvasRenderingContext2D,
  given: string,
  family: string,
  x: number,
  bottom: number,
  maxWidth: number,
  familySize: number,
  givenSize: number,
  scale: number,
  align: "left" | "center" = "left",
) => {
  const measure = (value: string) => context.measureText(value).width;
  // Chrome's canvas `letterSpacing` does not honor `textAlign: "center"`.
  // Measure each line and left-draw from the midpoint so export matches CSS.
  context.textAlign = "left";
  context.textBaseline = "bottom";
  context.fillStyle = "#fff";
  context.shadowColor = "rgba(0, 0, 0, 0.78)";
  context.shadowOffsetX = Math.round(1 * scale);
  context.shadowOffsetY = Math.round(1.1 * scale);
  context.shadowBlur = 0;

  const paintLine = (line: string, cursor: number) => {
    const width = measure(line);
    const drawX = align === "center" ? x - width / 2 : x;
    context.fillText(line, drawX, cursor);
    return width;
  };

  context.font = `900 ${familySize}px ${POSTER_FONT}`;
  setLetterSpacing(context, 0.04 * familySize);
  const familyLines = wrapNameToWidth(family, maxWidth, measure, 2);
  let cursor = bottom;
  [...familyLines].reverse().forEach((line) => {
    let size = familySize;
    context.font = `900 ${size}px ${POSTER_FONT}`;
    while (size > familySize * 0.72 && measure(line) > maxWidth) {
      size -= 0.5 * scale;
      context.font = `900 ${size}px ${POSTER_FONT}`;
    }
    paintLine(line, cursor);
    cursor -= size * 1.02;
  });
  setLetterSpacing(context, 0);

  const givenLine = given.trim().toUpperCase();
  if (givenLine) {
    let size = givenSize;
    context.font = `900 ${size}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.08 * size);
    while (size > givenSize * 0.72 && measure(givenLine) > maxWidth) {
      size -= 0.5 * scale;
      context.font = `900 ${size}px ${POSTER_FONT}`;
    }
    paintLine(givenLine, cursor);
    setLetterSpacing(context, 0);
  }

  context.shadowColor = "transparent";
};

export const drawPlayerNameFade = (
  context: CanvasRenderingContext2D,
  input: {
    x: number;
    y: number;
    w: number;
    h: number;
    given: string;
    family: string;
    logo: HTMLImageElement | null;
    logoSrc?: string;
    logoSize: number;
    familySize: number;
    givenSize: number;
    scale: number;
    pad?: number;
  },
) => {
  const pad = input.pad ?? 6 * input.scale;
  paintNameFadeRect(context, input.x, input.y, input.w, input.h);
  let textX = input.x + 4 * input.scale;
  if (input.logo) {
    const logoX = input.x + 4 * input.scale;
    const logoY = input.y + input.h - pad - input.logoSize;
    drawCoveredLogo(
      context,
      input.logo,
      logoX,
      logoY,
      input.logoSize,
      input.logoSize,
      { cacheKey: `${input.logoSrc ?? ""}-fade-cover` },
    );
    textX = input.x + input.logoSize + 8 * input.scale;
  }
  drawNameStack(
    context,
    input.given,
    input.family,
    textX,
    input.y + input.h - pad - 2 * input.scale,
    input.x + input.w - pad - textX,
    input.familySize,
    input.givenSize,
    input.scale,
  );
};
