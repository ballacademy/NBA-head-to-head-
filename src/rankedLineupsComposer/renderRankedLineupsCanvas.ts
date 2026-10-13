import {
  clipToInnerFrame,
  frameLinePx,
  paintCellFrame,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { drawPlayerNameFade } from "../instagramComposer/drawPlayerNameFade";
import { wrapNameToWidth } from "../instagramComposer/nameFit";
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
  RL_BRAND_H,
  RL_BRAND_SIZE,
  RL_FADE_NAME_H,
  RL_FOOTER_H,
  RL_NAME_FAMILY_SIZE,
  RL_NAME_GIVEN_SIZE,
  RL_NAME_LOGO,
  RL_PILL_GAP,
  RL_PILL_H,
  RL_PILL_SIZE,
  RL_POS_H,
  RL_POS_SIZE,
  RL_STRIP_H,
  RL_STRIP_W,
  RL_STRIPS_TOP,
  RL_TITLE_BLOCK_H,
  RL_TITLE_GRADIENT,
  RL_TITLE_SIZE,
  rlStripX,
} from "./rankedLineupsLayout";
import {
  lineupPosition,
  RANKED_LINEUP_STRIP_COUNT,
  RANKED_LINEUP_TITLE_TRACK,
  splitRankedLineupTitle,
  type RankedLineupStrip,
} from "./rankedLineupsState";

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
  fill: string | CanvasGradient,
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

const titleGradient = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
) => {
  const width = Math.max(1, context.measureText(text).width);
  const gradient = context.createLinearGradient(x - width / 2, y, x + width / 2, y);
  RL_TITLE_GRADIENT.forEach(([stop, color]) => gradient.addColorStop(stop, color));
  return gradient;
};

const roundRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) => {
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
};

const drawStripPhoto = async (
  context: CanvasRenderingContext2D,
  strip: RankedLineupStrip,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  look?: ComposerLook | null,
  showFade = false,
) => {
  context.save();
  context.fillStyle = "#111";
  context.fillRect(x, y, w, h);
  const inner = clipToInnerFrame(context, x, y, w, h, scale);
  if (strip.photoSrc) {
    const photo = strip.photoSrc.startsWith("data:")
      ? await loadImage(strip.photoSrc)
      : await loadCorsImage(strip.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        inner.x,
        inner.y,
        inner.w,
        inner.h,
        strip.pan.x,
        strip.pan.y,
        photoZoom(strip.pan),
      );
      const rotate = photoRotate(strip.pan);
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
  paintCellFrame(context, x, y, w, h, look, scale);
  if (!showFade) {
    return;
  }
  const line = frameLinePx(scale);
  const barH = Math.max(line, RL_FADE_NAME_H * scale - line);
  const team = getTeam(strip.teamId);
  const logo = team ? await loadImage(team.logoSrc) : null;
  drawPlayerNameFade(context, {
    x: x + line,
    y: y + h - line - barH,
    w: w - line * 2,
    h: barH,
    given: strip.firstName,
    family: strip.lastName,
    logo,
    logoSrc: team?.logoSrc,
    logoSize: RL_NAME_LOGO * scale,
    familySize: RL_NAME_FAMILY_SIZE * scale,
    givenSize: RL_NAME_GIVEN_SIZE * scale,
    scale,
  });
};

export interface RankedLineupsRenderInput {
  brand: string;
  title: string;
  rank: string;
  strips: RankedLineupStrip[];
  look?: ComposerLook;
  showBa?: boolean;
  showFade?: boolean;
}

export const renderRankedLineupsCanvas = async (
  input: RankedLineupsRenderInput,
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
    document.fonts?.load(`900 ${RL_TITLE_SIZE * scale}px ${POSTER_FONT}`),
    document.fonts?.load(
      `italic 900 ${RL_TITLE_SIZE * scale}px ${POSTER_FONT}`,
    ),
  ]).catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);

  const s = scale;
  withShadow(context, s, () => {
    context.font = `900 ${RL_BRAND_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.18 * RL_BRAND_SIZE * s);
    context.fillStyle = "#fff";
    context.fillText(input.brand.toUpperCase(), width / 2, 26 * s);
    setLetterSpacing(context, 0);
  });

  const titleLines = splitRankedLineupTitle(input.title);
  const lineH = RL_TITLE_SIZE * 0.92 * s;
  let titleY =
    RL_BRAND_H * s +
    (RL_TITLE_BLOCK_H * s - lineH * titleLines.length) / 2 +
    lineH / 2;
  context.font = `italic 900 ${RL_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, RANKED_LINEUP_TITLE_TRACK * RL_TITLE_SIZE * s);
  titleLines.forEach((line) => {
    withShadow(context, s, () => {
      strokeFillText(
        context,
        line,
        width / 2,
        titleY,
        titleGradient(context, line, width / 2, titleY),
        "#050505",
        3.4 * s,
      );
    });
    titleY += lineH;
  });
  setLetterSpacing(context, 0);

  const rankText = input.rank.trim().toUpperCase() || "BEST";
  context.font = `900 ${RL_PILL_SIZE * s}px ${POSTER_FONT}`;
  setLetterSpacing(context, 0.12 * RL_PILL_SIZE * s);
  const pillW = Math.max(
    148 * s,
    context.measureText(rankText).width + 44 * s,
  );
  const pillH = RL_PILL_H * s;
  const pillX = (width - pillW) / 2;
  const pillY = (RL_BRAND_H + RL_TITLE_BLOCK_H + RL_PILL_GAP) * s;
  roundRectPath(context, pillX, pillY, pillW, pillH, pillH / 2);
  context.fillStyle = "#fff";
  context.fill();
  context.lineWidth = 2 * s;
  context.strokeStyle = "#fff";
  context.stroke();
  context.fillStyle = "#111";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(rankText, width / 2, pillY + pillH / 2);
  setLetterSpacing(context, 0);

  const stripY = RL_STRIPS_TOP * s;
  const stripH = RL_STRIP_H * s;
  const stripW = RL_STRIP_W * s;
  for (let index = 0; index < RANKED_LINEUP_STRIP_COUNT; index += 1) {
    const strip = input.strips[index] ?? {
      playerId: null,
      teamId: null,
      firstName: "",
      lastName: "",
      photoSrc: null,
      customPhoto: false,
      pan: { x: 0.5, y: 0.22 },
    };
    await drawStripPhoto(
      context,
      strip,
      rlStripX(index) * s,
      stripY,
      stripW,
      stripH,
      s,
      input.look,
      input.showFade === true,
    );
  }

  const footerY = (GRAPHIC_HEIGHT - RL_FOOTER_H) * s;
  for (let index = 0; index < RANKED_LINEUP_STRIP_COUNT; index += 1) {
    const strip = input.strips[index];
    const x = rlStripX(index) * s;
    const cx = x + stripW / 2;
    context.font = `900 ${RL_POS_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const pos = lineupPosition(index);
    withShadow(context, s, () => {
      strokeFillText(
        context,
        pos,
        cx,
        footerY + (RL_POS_H * s) / 2,
        titleGradient(context, pos, cx, footerY + (RL_POS_H * s) / 2),
        "#050505",
        2.4 * s,
      );
    });

    if (input.showFade) {
      continue;
    }
    const given = (strip?.firstName ?? "").trim().toUpperCase();
    const family = (strip?.lastName ?? "").trim().toUpperCase();
    const nameTop = footerY + RL_POS_H * s;
    const nameW = stripW - 8 * s;
    if (given) {
      context.font = `900 ${RL_NAME_GIVEN_SIZE * s}px ${POSTER_FONT}`;
      setLetterSpacing(context, 0.08 * RL_NAME_GIVEN_SIZE * s);
      context.fillStyle = "#fff";
      context.textBaseline = "middle";
      withShadow(context, s, () => {
        context.fillText(given, cx, nameTop + 12 * s);
      });
      setLetterSpacing(context, 0);
    }
    if (family) {
      context.font = `900 ${RL_NAME_FAMILY_SIZE * s}px ${POSTER_FONT}`;
      setLetterSpacing(context, 0.04 * RL_NAME_FAMILY_SIZE * s);
      const lines = wrapNameToWidth(
        family,
        nameW,
        (value) => context.measureText(value).width,
        2,
      );
      lines.forEach((line, lineIndex) => {
        withShadow(context, s, () => {
          context.fillText(
            line,
            cx,
            nameTop + 28 * s + lineIndex * (RL_NAME_FAMILY_SIZE * 0.95 * s),
          );
        });
      });
      setLetterSpacing(context, 0);
    }
  }

  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 72 * s;
      const inset = 42 * s;
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
