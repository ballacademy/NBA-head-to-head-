import {
  paintCellFrame,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { readComposerNameStyle } from "../instagramComposer/composerNameStyle";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import {
  applyPhotoGrade,
  canvasGradeFilter,
} from "../instagramComposer/photoGrade";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
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
import {
  GRAPHIC_WIDTH,
  CMP_BRAND,
  CMP_BRAND_H,
  CMP_BRAND_SIZE,
  CMP_BRAND_TOP,
  CMP_PAD,
  CMP_SUB_H,
  CMP_SUB_SIZE,
  CMP_TITLE_H,
  CMP_TITLE_SIZE,
  CMP_NAME_SIZE,
  CMP_LEAD,
  compareBoardHeight,
  comparePhotoFrame,
  compareStatType,
  compareTitleTop,
} from "./compareLayout";
import {
  compareSideCaption,
  compareWinner,
  leadingSide,
  visibleCompareStats,
  type CompareDraft,
} from "./compareState";
import { getTeam } from "../standingsComposer/teams";

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
  }
};

const strokeFill = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  strokeW: number,
) => {
  context.lineJoin = "round";
  if (strokeW > 0) {
    context.strokeStyle = "#000";
    context.lineWidth = strokeW;
    context.strokeText(text, x, y);
  }
  context.fillStyle = fill;
  context.fillText(text, x, y);
};

export type CompareRenderInput = CompareDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
};

export const renderCompareCanvas = async (
  input: CompareRenderInput,
  scale = 2,
) => {
  const width = GRAPHIC_WIDTH * scale;
  const height = compareBoardHeight(input.story) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open canvas");
  }
  await document.fonts?.ready.catch(() => undefined);
  const s = scale;
  const field = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, field, width, height);
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  const showBa = input.showBa !== false;
  const titleX = CMP_PAD * s;
  const titleW = width - CMP_PAD * 2 * s;
  const titleY = compareTitleTop(showBa) * s;
  const titleH = CMP_TITLE_H * s;
  if (showBa) {
    context.font = `900 ${CMP_BRAND_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.18 * CMP_BRAND_SIZE * s);
    context.fillStyle = "#fff";
    context.shadowColor = "rgba(0,0,0,0.82)";
    context.shadowBlur = 0;
    context.shadowOffsetX = 1 * s;
    context.shadowOffsetY = 1.2 * s;
    context.fillText(
      CMP_BRAND,
      width / 2,
      (CMP_BRAND_TOP + CMP_BRAND_H / 2) * s,
      width * 0.8,
    );
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    setLetterSpacing(context, 0);
  }
  context.fillStyle = "#1c1c1c";
  context.fillRect(titleX, titleY, titleW, titleH);
  paintCellFrame(context, titleX, titleY, titleW, titleH, input.look, s);
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, titleX, titleY, titleW, titleH, s);
  }
  context.font = `900 ${CMP_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.04 * CMP_TITLE_SIZE * s);
  context.fillStyle = "#fff";
  context.fillText(
    input.title.trim().toUpperCase() || "COMPARE",
    width / 2,
    titleY + titleH / 2,
    titleW - 24 * s,
  );
  setLetterSpacing(context, 0);

  const frame = comparePhotoFrame(
    Boolean(input.story),
    Boolean(input.subtitle.trim()),
    showBa,
  );
  const winner =
    input.showWinner === true ? compareWinner(input.stats) : null;
  const photoY = frame.y * s;
  const photoH = frame.h * s;
  const photoW = frame.w * s;
  const leftX = frame.leftX * s;
  const rightX = frame.rightX * s;
  const statsX = frame.statsX * s;
  const statsW = frame.statsW * s;

  for (const [side, x] of [
    [0, leftX],
    [1, rightX],
  ] as const) {
    const person = input.sides[side]!;
    context.fillStyle = "#111";
    context.fillRect(x, photoY, photoW, photoH);
    const watermark = parseComposerWatermark(input.watermark);
    const team = getTeam(person.teamId);
    if (team && watermark !== "off") {
      const mark = await loadImage(team.logoSrc);
      if (mark) {
        const size = 220 * s;
        context.save();
        context.globalAlpha = composerWatermarkOpacity(watermark);
        context.drawImage(
          mark,
          x + (photoW - size) / 2,
          photoY + photoH * 0.28,
          size,
          size,
        );
        context.restore();
      }
    }
    if (person.photoSrc) {
      const photo = person.photoSrc.startsWith("data:")
        ? await loadImage(person.photoSrc)
        : await loadCorsImage(person.photoSrc);
      if (photo) {
        const dest = coverPanDraw(
          photo.naturalWidth || photo.width,
          photo.naturalHeight || photo.height,
          x,
          photoY,
          photoW,
          photoH,
          person.pan.x,
          person.pan.y,
          photoZoom(person.pan),
        );
        context.save();
        context.filter = canvasGradeFilter(input.photoGrade);
        context.beginPath();
        context.rect(x, photoY, photoW, photoH);
        context.clip();
        const rotate = photoRotate(person.pan);
        if (rotate) {
          context.translate(x + photoW / 2, photoY + photoH / 2);
          context.rotate((rotate * Math.PI) / 180);
          context.drawImage(
            photo,
            dest.dx - x - photoW / 2,
            dest.dy - photoY - photoH / 2,
            dest.dw,
            dest.dh,
          );
        } else {
          context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
        }
        context.restore();
        applyPhotoGrade(
          context,
          x,
          photoY,
          photoW,
          photoH,
          input.photoGrade,
        );
        paintPhotoVignette(
          context,
          x,
          photoY,
          photoW,
          photoH,
          input.photoGrade,
        );
      }
    }
    paintCellFrame(context, x, photoY, photoW, photoH, input.look, s);
    if (winner === side) {
      context.save();
      context.strokeStyle = "rgba(255, 229, 102, 0.55)";
      context.lineWidth = 10 * s;
      context.strokeRect(x + 6 * s, photoY + 6 * s, photoW - 12 * s, photoH - 12 * s);
      const badge = 36 * s;
      context.fillStyle = "rgba(255, 229, 102, 0.92)";
      context.beginPath();
      context.arc(x + photoW - 30 * s, photoY + 30 * s, badge / 2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#111";
      context.font = `900 ${18 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("W", x + photoW - 30 * s, photoY + 30 * s);
      context.restore();
    }
    const caption = compareSideCaption(person, readComposerNameStyle());
    if (caption) {
      const fadeH = 96 * s;
      const fade = context.createLinearGradient(
        0,
        photoY + photoH - fadeH,
        0,
        photoY + photoH,
      );
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(0.45, "rgba(0,0,0,0.72)");
      fade.addColorStop(1, "rgba(0,0,0,0.92)");
      context.fillStyle = fade;
      context.fillRect(x, photoY + photoH - fadeH, photoW, fadeH);
      context.font = `900 ${CMP_NAME_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "bottom";
      setLetterSpacing(context, 0.08 * CMP_NAME_SIZE * s);
      context.fillStyle = "#fff";
      context.fillText(
        caption.toUpperCase(),
        x + photoW / 2,
        photoY + photoH - 16 * s,
        photoW - 20 * s,
      );
      setLetterSpacing(context, 0);
    }
  }

  const stats = visibleCompareStats(input.stats, true);
  const type = compareStatType(stats.length || input.stats.length);
  context.font = `900 ${18 * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, 0.16 * 18 * s);
  context.fillStyle = "#fff";
  context.fillText(
    (input.statsLabel || "STATS").toUpperCase(),
    statsX + statsW / 2,
    photoY + 29 * s,
    statsW,
  );
  setLetterSpacing(context, 0);

  const rowCount = Math.max(stats.length, 1);
  const bodyTop = photoY + 36 * s;
  const bodyH = photoH - 52 * s;
  const rowSpan = bodyH / rowCount;
  stats.forEach((stat, index) => {
    const y = bodyTop + index * rowSpan + rowSpan / 2;
    const lead = leadingSide(stat.left, stat.right);
    const mid = statsX + statsW / 2;
    context.fillStyle = "rgba(255,255,255,0.45)";
    const ruleH = Math.max(20 * s, rowSpan * type.rule);
    context.fillRect(
      mid - s,
      y - ruleH / 2,
      2 * s,
      ruleH,
    );
    context.font = `900 ${type.value * s}px ${POSTER_FONT}`;
    context.textBaseline = "middle";
    context.textAlign = "right";
    strokeFill(
      context,
      stat.left,
      mid - 16 * s,
      y - type.label * 0.55 * s,
      lead === 0 ? CMP_LEAD : "#fff",
      type.stroke * s,
    );
    context.textAlign = "left";
    strokeFill(
      context,
      stat.right,
      mid + 16 * s,
      y - type.label * 0.55 * s,
      lead === 1 ? CMP_LEAD : "#fff",
      type.stroke * s,
    );
    const unit = (stat.label || "").toUpperCase();
    context.font = `900 ${type.label * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.14 * type.label * s);
    context.textAlign = "right";
    context.fillStyle = lead === 0 ? CMP_LEAD : "rgba(255,255,255,0.78)";
    context.fillText(unit, mid - 16 * s, y + type.value * 0.42 * s);
    context.textAlign = "left";
    context.fillStyle = lead === 1 ? CMP_LEAD : "rgba(255,255,255,0.78)";
    context.fillText(unit, mid + 16 * s, y + type.value * 0.42 * s);
    setLetterSpacing(context, 0);
  });

  const subtitle = input.subtitle.trim().toUpperCase();
  if (subtitle) {
    const subY = height - 36 * s - CMP_SUB_H * s;
    context.fillStyle = "#1c1c1c";
    context.fillRect(titleX, subY, titleW, CMP_SUB_H * s);
    paintCellFrame(context, titleX, subY, titleW, CMP_SUB_H * s, input.look, s);
    if (input.purpleFlair) {
      paintPurplePlateEdge(context, titleX, subY, titleW, CMP_SUB_H * s, s);
    }
    context.font = `900 ${CMP_SUB_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.06 * CMP_SUB_SIZE * s);
    context.fillStyle = "#fff";
    context.fillText(
      subtitle,
      width / 2,
      subY + (CMP_SUB_H * s) / 2,
      titleW - 24 * s,
    );
    setLetterSpacing(context, 0);
  }

  return canvas;
};
