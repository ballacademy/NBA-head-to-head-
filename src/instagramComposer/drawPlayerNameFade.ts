import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import {
  composerNameLines,
  readComposerNameStyle,
  type ComposerNameStyle,
} from "./composerNameStyle";
import { abbreviateOverflowName } from "./nameFit";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

export const NAME_FADE_STOPS: Array<[number, string]> = [
  [0, "rgba(0, 0, 0, 0)"],
  [0.22, "rgba(0, 0, 0, 0.42)"],
  [0.48, "rgba(0, 0, 0, 0.78)"],
  [0.72, "rgba(0, 0, 0, 0.94)"],
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
  const familyLine = abbreviateOverflowName(family, maxWidth, measure);
  let cursor = bottom;
  if (familyLine) {
    paintLine(familyLine, cursor);
    cursor -= familySize * 1.02;
  }
  setLetterSpacing(context, 0);

  if (given.trim()) {
    context.font = `900 ${givenSize}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.08 * givenSize);
    const givenLine = abbreviateOverflowName(given, maxWidth, measure);
    if (givenLine) {
      paintLine(givenLine, cursor);
    }
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
    nameStyle?: ComposerNameStyle;
  },
) => {
  const pad = input.pad ?? 5 * input.scale;
  const lines = composerNameLines(
    input.given,
    input.family,
    input.nameStyle ?? readComposerNameStyle(),
  );
  paintNameFadeRect(context, input.x, input.y, input.w, input.h);
  const hasGiven = Boolean(lines.given.trim());
  const stackH =
    input.familySize + (hasGiven ? input.givenSize * 1.15 : 0);
  const lockupH = Math.max(input.logo ? input.logoSize : 0, stackH);
  const lockupBottom = input.y + input.h - pad;
  const lockupTop = lockupBottom - lockupH;
  let textX = input.x + 4 * input.scale;
  if (input.logo) {
    const logoX = textX;
    const logoY = lockupTop + (lockupH - input.logoSize) / 2;
    drawCenteredLogo(
      context,
      input.logo,
      logoX,
      logoY,
      input.logoSize,
      input.logoSize,
      {
        cacheKey: `${input.logoSrc ?? ""}-fade-lockup`,
        shadow: Math.max(1, Math.round(1.2 * input.scale)),
        fitX: 0.9,
        fitY: 0.9,
      },
    );
    textX = logoX + input.logoSize + 4 * input.scale;
  }
  drawNameStack(
    context,
    lines.given,
    lines.family,
    textX,
    lockupBottom,
    input.x + input.w - pad - textX,
    input.familySize,
    input.givenSize,
    input.scale,
  );
};
