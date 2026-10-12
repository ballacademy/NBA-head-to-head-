import {
  isImprovedLook,
  paintImproveCellLight,
  paintImproveCellRim,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
import { loadCorsImage } from "../lib/playerHeadshots";
import {
  drawBannerInterior,
  drawCoveredTexture,
} from "../standingsComposer/headerTexture";
import {
  drawCenteredLogo,
  drawCoveredLogo,
} from "../standingsComposer/logoDraw";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  POTD_BRAND_SIZE,
  POTD_CARD_W,
  POTD_CRACKS_SRC,
  POTD_DATE_SIZE,
  POTD_FOOTER,
  POTD_HEADER_H,
  POTD_LOGO_WATERMARK,
  POTD_NAME_H,
  POTD_NAME_SIZE,
  POTD_RESULT_H,
  POTD_STAT_SIZE,
  POTD_STATS_H,
  POTD_TITLE_SIZE,
  POTD_TOTAL_SIZE,
  coverPanDraw,
  potdCardX,
  statsFillForTeam,
} from "./playerOfTheDayLayout";
import {
  POTD_TITLE_TRACK,
  photoZoom,
  splitPotdTitle,
  type PotdCard,
} from "./playerOfTheDayState";

export { canvasToPngBlob };

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const STAT_FIELDS: Array<{
  key: "pts" | "blk" | "reb" | "fg" | "ast" | "three" | "stl" | "tov";
  label: string;
}> = [
  { key: "pts", label: "PTS" },
  { key: "blk", label: "BLK" },
  { key: "reb", label: "REB" },
  { key: "fg", label: "FG" },
  { key: "ast", label: "AST" },
  { key: "three", label: "3P" },
  { key: "stl", label: "STL" },
  { key: "tov", label: "TOV" },
];

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

export interface PlayerOfTheDayRenderInput {
  brand: string;
  title: string;
  date: string;
  cards: PotdCard[];
  look?: ComposerLook;
}

export const renderPlayerOfTheDayCanvas = async (
  input: PlayerOfTheDayRenderInput,
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
    document.fonts?.load(`900 ${POTD_TITLE_SIZE * scale}px ${POSTER_FONT}`),
    document.fonts?.load(`italic 900 ${POTD_TITLE_SIZE * scale}px ${POSTER_FONT}`),
  ]).catch(() => undefined);

  context.fillStyle = "#1c1c1c";
  context.fillRect(0, 0, width, height);
  const cracks = await loadImage(POTD_CRACKS_SRC);
  if (cracks) {
    drawCoveredTexture(context, cracks, 0, 0, width, height);
  }

  const s = scale;
  withShadow(context, s, () => {
    context.font = `900 ${POTD_BRAND_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.18 * POTD_BRAND_SIZE * s);
    context.fillStyle = "#fff";
    context.fillText(input.brand.toUpperCase(), width / 2, 28 * s);
    setLetterSpacing(context, 0);
  });

  const plate = {
    x: 48 * s,
    y: 58 * s,
    w: width - 96 * s,
    h: 168 * s,
  };
  context.fillStyle = "#0a0a0a";
  context.fillRect(plate.x - 6 * s, plate.y - 6 * s, plate.w + 12 * s, plate.h + 12 * s);
  context.strokeStyle = "#fff";
  context.lineWidth = 3 * s;
  context.strokeRect(plate.x - 3 * s, plate.y - 3 * s, plate.w + 6 * s, plate.h + 6 * s);
  drawBannerInterior(context, plate.x, plate.y, plate.w, plate.h, s, () => {
    context.beginPath();
    context.rect(plate.x, plate.y, plate.w, plate.h);
  });
  if (isImprovedLook(input.look)) {
    paintImproveCellRim(context, plate.x, plate.y, plate.w, plate.h);
  }

  const titleLines = splitPotdTitle(input.title);
  const lineH = POTD_TITLE_SIZE * 0.92 * s;
  const titleBlock = lineH * titleLines.length;
  let titleY = plate.y + (plate.h - titleBlock) / 2 + lineH / 2;
  context.font = `italic 900 ${POTD_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, POTD_TITLE_TRACK * POTD_TITLE_SIZE * s);
  titleLines.forEach((line) => {
    withShadow(context, s, () => {
      strokeFillText(
        context,
        line,
        width / 2,
        titleY,
        "#fff",
        "#000",
        3.2 * s,
      );
    });
    titleY += lineH;
  });
  setLetterSpacing(context, 0);

  const dateText = `DATE: ${input.date}`.toUpperCase();
  context.font = `900 ${POTD_DATE_SIZE * s}px ${POSTER_FONT}`;
  const dateW = Math.max(280 * s, context.measureText(dateText).width + 48 * s);
  const dateH = 36 * s;
  const dateX = (width - dateW) / 2;
  const dateY = plate.y + plate.h - 2 * s;
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(dateX + dateW * 0.06, dateY);
  context.lineTo(dateX + dateW * 0.94, dateY);
  context.lineTo(dateX + dateW, dateY + dateH);
  context.lineTo(dateX, dateY + dateH);
  context.closePath();
  context.fill();
  context.fillStyle = "#111";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(dateText, width / 2, dateY + dateH / 2);

  const bodyTop = POTD_HEADER_H * s;
  const bodyH = height - bodyTop - POTD_FOOTER * s;
  const nameH = POTD_NAME_H * s;
  const resultH = POTD_RESULT_H * s;
  const statsH = POTD_STATS_H * s;
  const photoH = bodyH - nameH - resultH - statsH;
  const improved = isImprovedLook(input.look);

  for (let index = 0; index < input.cards.length; index += 1) {
    const card = input.cards[index]!;
    const x = potdCardX(index) * s;
    const w = POTD_CARD_W * s;
    const photoY = bodyTop;
    const statsY = photoY + photoH;
    const resultY = statsY + statsH;
    const nameY = resultY + resultH;
    const fill = statsFillForTeam(card.teamId);
    const team = getTeam(card.teamId);

    context.save();
    context.beginPath();
    context.rect(x, photoY, w, photoH);
    context.clip();
    context.fillStyle = "#111";
    context.fillRect(x, photoY, w, photoH);
    if (card.photoSrc) {
      const photo = card.photoSrc.startsWith("data:")
        ? await loadImage(card.photoSrc)
        : await loadCorsImage(card.photoSrc);
      if (photo) {
        const dest = coverPanDraw(
          photo.naturalWidth || photo.width,
          photo.naturalHeight || photo.height,
          x,
          photoY,
          w,
          photoH,
          card.pan.x,
          card.pan.y,
          photoZoom(card.pan),
        );
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
    }
    context.restore();
    if (improved) {
      paintImproveCellRim(context, x, photoY, w, photoH);
    }

    context.font = `900 ${POTD_TOTAL_SIZE * s}px ${POSTER_FONT}`;
    context.fillStyle = "#fff";
    context.textBaseline = "top";
    const total = `TOTAL: ${card.total}`.toUpperCase();
    if (index === 0) {
      context.textAlign = "left";
      withShadow(context, s, () => {
        context.fillText(total, x + 10 * s, photoY + 10 * s);
      });
    } else {
      context.textAlign = "right";
      withShadow(context, s, () => {
        context.fillText(total, x + w - 10 * s, photoY + 10 * s);
      });
    }

    context.fillStyle = fill;
    context.fillRect(x, statsY, w, statsH);
    if (team) {
      const logo = await loadImage(team.logoSrc);
      if (logo) {
        context.save();
        context.globalAlpha = POTD_LOGO_WATERMARK;
        drawCenteredLogo(
          context,
          logo,
          x + w * 0.08,
          statsY + statsH * 0.08,
          w * 0.84,
          statsH * 0.84,
          { cacheKey: team.logoSrc, fitX: 0.92, fitY: 0.92 },
        );
        context.restore();
      }
    }
    context.font = `900 ${POTD_STAT_SIZE * s}px ${POSTER_FONT}`;
    context.fillStyle = "#fff";
    context.textBaseline = "middle";
    const colW = w / 2;
    const rowH = statsH / 4;
    STAT_FIELDS.forEach((field, statIndex) => {
      const col = statIndex % 2;
      const row = Math.floor(statIndex / 2);
      const cx = x + 16 * s + col * colW;
      const cy = statsY + rowH * (row + 0.5);
      context.textAlign = "left";
      withShadow(context, s, () => {
        context.fillText(
          `${card.stats[field.key]} ${field.label}`.toUpperCase(),
          cx,
          cy,
        );
      });
    });
    if (improved) {
      paintImproveCellLight(context, x, statsY, w, statsH);
      paintImproveCellRim(context, x, statsY, w, statsH);
    }

    const resultFill = team
      ? getTeamColors(team.id).primary
      : fill;
    context.fillStyle = resultFill;
    context.globalAlpha = 0.92;
    context.fillRect(x, resultY, w, resultH);
    context.globalAlpha = 1;
    context.fillStyle = "#fff";
    context.font = `900 ${20 * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      (card.result || "").toUpperCase(),
      x + w / 2,
      resultY + resultH / 2,
    );

    context.fillStyle = "#0a0a0a";
    context.fillRect(x, nameY, w, nameH);
    if (team) {
      const logo = await loadImage(team.logoSrc);
      if (logo) {
        context.save();
        context.globalAlpha = 0.88;
        drawCoveredLogo(context, logo, x, nameY, w, nameH, {
          cacheKey: `${team.logoSrc}-name-cover`,
        });
        context.restore();
      }
    }
    context.fillStyle = "#fff";
    context.font = `900 ${POTD_NAME_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    setLetterSpacing(context, 0.04 * POTD_NAME_SIZE * s);
    const nameCX = x + w / 2;
    withShadow(context, s, () => {
      if (card.firstName || card.lastName) {
        context.fillText(card.firstName.toUpperCase(), nameCX, nameY + nameH * 0.36);
        context.fillText(card.lastName.toUpperCase(), nameCX, nameY + nameH * 0.7);
      }
    });
    setLetterSpacing(context, 0);
    if (improved) {
      paintImproveCellLight(context, x, nameY, w, nameH);
      paintImproveCellRim(context, x, nameY, w, nameH);
    }
  }

  return canvas;
};
