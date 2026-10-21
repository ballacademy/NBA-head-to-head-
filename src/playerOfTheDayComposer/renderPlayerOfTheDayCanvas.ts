import {
  clipToInnerFrame,
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurpleInnerHairline,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerNameLines,
  readComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import {
  applyPhotoGrade,
  canvasGradeFilter,
} from "../instagramComposer/photoGrade";
import { getTeamColors } from "../lib/teamColors";
import { loadCorsImage } from "../lib/playerHeadshots";
import {
  FIELD_TEXTURE_SRC,
  drawBannerInterior,
  paintBoardField,
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
  POTD_DATE_SIZE,
  POTD_FOOTER,
  POTD_HEADER_H,
  POTD_PLATE_H,
  POTD_PLATE_X,
  POTD_PLATE_Y,
  POTD_LOGO_WATERMARK,
  POTD_NAME_H,
  POTD_RESULT_H,
  POTD_STATS_H,
  POTD_TITLE_PAD,
  POTD_TITLE_SIZE,
  POTD_TOTAL_SIZE,
  POTD_CARD_RADIUS,
  POTD_PHOTO_BORDER,
  POTD_WL_CHIP_GAP,
  POTD_WL_CHIP_H,
  POTD_WL_CHIP_RADIUS,
  POTD_WL_CHIP_SIZE,
  POTD_WL_CHIP_W,
  addRoundRectPath,
  coverPanDraw,
  paintPotdPhotoBorder,
  paintPotdPlateBorder,
  potdCardW,
  potdCardX,
  potdNameSize,
  potdResultSize,
  potdStatCell,
  potdStatSize,
  statsFillForTeam,
} from "./playerOfTheDayLayout";
import {
  POTD_TITLE_TRACK,
  photoRotate,
  photoZoom,
  potdResultChipFill,
  potdResultLineDisplay,
  potdResultOutcome,
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

const paintWlChip = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  outcome: "W" | "L",
) => {
  const w = POTD_WL_CHIP_W * s;
  const h = POTD_WL_CHIP_H * s;
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.38)";
  context.shadowOffsetX = Math.round(1 * s);
  context.shadowOffsetY = Math.round(1.2 * s);
  context.shadowBlur = 0;
  context.beginPath();
  addRoundRectPath(context, x, y, w, h, POTD_WL_CHIP_RADIUS * s);
  context.fillStyle = potdResultChipFill(outcome);
  context.fill();
  context.shadowColor = "transparent";
  context.lineWidth = Math.max(1, 1.2 * s);
  context.strokeStyle = "rgba(0, 0, 0, 0.5)";
  context.stroke();
  context.fillStyle = "#fff";
  context.font = `900 ${POTD_WL_CHIP_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(outcome, x + w / 2, y + h / 2 + 0.4 * s);
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
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  wlColor?: boolean;
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

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);
  const s = scale;
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }
  if (!input.showBa) {
    withShadow(context, s, () => {
      context.font = `900 ${POTD_BRAND_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      setLetterSpacing(context, 0.18 * POTD_BRAND_SIZE * s);
      context.fillStyle = "#fff";
      context.fillText(input.brand.toUpperCase(), width / 2, 28 * s);
      setLetterSpacing(context, 0);
    });
  }

  const plate = {
    x: POTD_PLATE_X * s,
    y: POTD_PLATE_Y * s,
    w: width - POTD_PLATE_X * 2 * s,
    h: POTD_PLATE_H * s,
  };
  drawBannerInterior(context, plate.x, plate.y, plate.w, plate.h, s, () => {
    context.beginPath();
    context.rect(plate.x, plate.y, plate.w, plate.h);
  });
  paintCellFrame(context, plate.x, plate.y, plate.w, plate.h, input.look, s);
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, plate.x, plate.y, plate.w, plate.h, s);
  }

  const titleLines = splitPotdTitle(input.title);
  const lineH = POTD_TITLE_SIZE * 0.92 * s;
  const titleBlock = lineH * titleLines.length;
  let titleY = plate.y + (plate.h - titleBlock) / 2 + lineH / 2;
  context.save();
  const titleInner = clipToInnerFrame(
    context,
    plate.x,
    plate.y,
    plate.w,
    plate.h,
    s,
    input.look,
  );
  const titlePad = POTD_TITLE_PAD * s;
  context.beginPath();
  context.rect(
    titleInner.x + titlePad,
    titleInner.y + titlePad,
    titleInner.w - titlePad * 2,
    titleInner.h - titlePad * 2,
  );
  context.clip();
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
  context.restore();

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
  const cardCount = input.cards.length;

  for (let index = 0; index < cardCount; index += 1) {
    const card = input.cards[index]!;
    const x = potdCardX(index, cardCount) * s;
    const w = potdCardW(cardCount) * s;
    const photoY = bodyTop;
    const statsY = photoY + photoH;
    const resultY = statsY + statsH;
    const nameY = resultY + resultH;
    const fill = statsFillForTeam(card.teamId);
    const team = getTeam(card.teamId);
    const radius = POTD_CARD_RADIUS * s;
    const cardH = nameY + nameH - photoY;

    context.save();
    context.beginPath();
    addRoundRectPath(context, x, photoY, w, cardH, radius);
    context.clip();

    context.save();
    context.filter = canvasGradeFilter(input.photoGrade);
    context.beginPath();
    addRoundRectPath(context, x, photoY, w, photoH, [radius, radius, 0, 0]);
    context.clip();
    context.fillStyle = "#111";
    context.fillRect(x, photoY, w, photoH);
    const photoLine =
      input.look === "none" ? 0 : Math.max(2, POTD_PHOTO_BORDER * s);
    context.beginPath();
    addRoundRectPath(
      context,
      x + photoLine,
      photoY + photoLine,
      w - photoLine * 2,
      photoH - photoLine * 2,
      [Math.max(0, radius - photoLine), Math.max(0, radius - photoLine), 0, 0],
    );
    context.clip();
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
        const rotate = photoRotate(card.pan);
        if (rotate) {
          context.save();
          context.translate(x + w / 2, photoY + photoH / 2);
          context.rotate((rotate * Math.PI) / 180);
          context.drawImage(
            photo,
            dest.dx - (x + w / 2),
            dest.dy - (photoY + photoH / 2),
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
    applyPhotoGrade(context, x, photoY, w, photoH, input.photoGrade);
    paintPotdPhotoBorder(context, x, photoY, w, photoH, s, input.look);

    if (card.playerId) {
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
    }

    context.fillStyle = fill;
    context.fillRect(x, statsY, w, statsH);
    context.save();
    const statsInner = clipToInnerFrame(
      context,
      x,
      statsY,
      w,
      statsH,
      s,
      input.look,
    );
    if (team) {
      const logo = await loadImage(team.logoSrc);
      if (logo) {
        context.globalAlpha = POTD_LOGO_WATERMARK;
        drawCenteredLogo(
          context,
          logo,
          statsInner.x + statsInner.w * 0.08,
          statsInner.y + statsInner.h * 0.08,
          statsInner.w * 0.84,
          statsInner.h * 0.84,
          { cacheKey: team.logoSrc, fitX: 0.92, fitY: 0.92 },
        );
        context.globalAlpha = 1;
      }
    }
    context.font = `900 ${potdStatSize(cardCount) * s}px ${POSTER_FONT}`;
    context.fillStyle = "#fff";
    context.textBaseline = "middle";
    context.textAlign = "center";
    STAT_FIELDS.forEach((field, statIndex) => {
      const { cx, cy } = potdStatCell(x, w, statsY, statsH, statIndex);
      withShadow(context, s, () => {
        context.fillText(
          `${card.stats[field.key]} ${field.label}`.toUpperCase(),
          cx,
          cy,
        );
      });
    });
    context.restore();
    paintPotdPlateBorder(context, x, statsY, w, statsH, s, input.look);

    const resultFill = team
      ? getTeamColors(team.id).primary
      : fill;
    context.fillStyle = resultFill;
    context.globalAlpha = 0.92;
    context.fillRect(x, resultY, w, resultH);
    context.globalAlpha = 1;
    const outcome =
      input.wlColor === true ? potdResultOutcome(card.result) : null;
    const resultText = potdResultLineDisplay(
      card.result,
      Boolean(outcome),
    ).toUpperCase();
    const resultSize = potdResultSize(cardCount);
    context.font = `900 ${resultSize * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.04 * resultSize * s);
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    const lineW = resultText ? context.measureText(resultText).width : 0;
    const chipW = POTD_WL_CHIP_W * s;
    const gap = POTD_WL_CHIP_GAP * s;
    const groupW = outcome
      ? chipW + (lineW ? gap + lineW : 0)
      : lineW;
    let cursor = x + (w - groupW) / 2;
    const resultMid = resultY + resultH / 2;
    if (outcome) {
      paintWlChip(
        context,
        cursor,
        resultMid - (POTD_WL_CHIP_H * s) / 2,
        s,
        outcome,
      );
      cursor += chipW + gap;
    }
    if (resultText) {
      context.textAlign = "left";
      context.fillStyle = "#fff";
      context.fillText(resultText, cursor, resultMid);
    }
    setLetterSpacing(context, 0);
    paintPotdPlateBorder(context, x, resultY, w, resultH, s, input.look);

    context.fillStyle = "#0a0a0a";
    context.fillRect(x, nameY, w, nameH);
    context.save();
    clipToInnerFrame(context, x, nameY, w, nameH, s, input.look);
    if (team) {
      const logo = await loadImage(team.logoSrc);
      if (logo) {
        context.globalAlpha = 0.26;
        drawCoveredLogo(context, logo, x, nameY, w, nameH, {
          cacheKey: `${team.logoSrc}-name-cover`,
        });
        context.globalAlpha = 1;
      }
    }
    const nameShade = context.createLinearGradient(x, nameY, x, nameY + nameH);
    nameShade.addColorStop(0, "rgba(0, 0, 0, 0.42)");
    nameShade.addColorStop(1, "rgba(0, 0, 0, 0.82)");
    context.fillStyle = nameShade;
    context.fillRect(x, nameY, w, nameH);
    context.font = `900 ${potdNameSize(cardCount) * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    setLetterSpacing(context, 0.04 * potdNameSize(cardCount) * s);
    const nameCX = x + w / 2;
    context.lineJoin = "round";
    context.strokeStyle = "#000";
    context.lineWidth = 4.2 * s;
    context.fillStyle = "#fff";
    if (card.firstName || card.lastName) {
      const lines = composerNameLines(
        card.firstName,
        card.lastName,
        readComposerNameStyle(),
      );
      if (lines.given) {
        context.strokeText(lines.given.toUpperCase(), nameCX, nameY + nameH * 0.36);
        context.fillText(lines.given.toUpperCase(), nameCX, nameY + nameH * 0.36);
      }
      context.strokeText(
        lines.family.toUpperCase(),
        nameCX,
        nameY + nameH * (lines.given ? 0.7 : 0.55),
      );
      context.fillText(
        lines.family.toUpperCase(),
        nameCX,
        nameY + nameH * (lines.given ? 0.7 : 0.55),
      );
    }
    setLetterSpacing(context, 0);
    context.restore();
    paintPotdPlateBorder(context, x, nameY, w, nameH, s, input.look, [
      0,
      0,
      radius,
      radius,
    ]);
    if (input.purpleFlair) {
      paintPurpleInnerHairline(context, x, photoY, w, photoH, s, input.look);
      paintPurpleInnerHairline(context, x, statsY, w, statsH, s, input.look);
      paintPurpleInnerHairline(context, x, nameY, w, nameH, s, input.look);
    }
    context.restore();
  }

  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 72 * s;
      const inset = 42 * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
