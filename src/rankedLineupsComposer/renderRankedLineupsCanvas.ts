import {
  clipToInnerFrame,
  frameLinePx,
  innerFrameRect,
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurpleInnerHairline,
  paintPurplePlateEdge,
  paintTeamHairline,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerNameLines,
  readComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { drawPlayerNameFade } from "../instagramComposer/drawPlayerNameFade";
import { wrapNameToWidth } from "../instagramComposer/nameFit";
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
  drawBannerInterior,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
  RL_BRAND_H,
  RL_BRAND_SIZE,
  RL_FADE_NAME_H,
  RL_HEADLINE_SIZE,
  RL_HEADLINE_SUB_SIZE,
  RL_NAME_FAMILY_SIZE,
  RL_NAME_GIVEN_SIZE,
  RL_NAME_LOGO,
  RL_PILL_GAP,
  RL_PILL_H,
  RL_PILL_SIZE,
  RL_POS_H,
  RL_POS_SIZE,
  RL_STRIP_W,
  RL_TITLE_BOX_H,
  RL_TITLE_BOX_X,
  RL_TITLE_GRADIENT,
  RL_TITLE_LINE,
  RL_TITLE_PAD_X,
  RL_TITLE_PAD_Y,
  RL_TITLE_SIZE,
  rankedFooterH,
  rankedHeaderH,
  rankedStripH,
  rankedStripRect,
  rlStripX,
  type RankDisplay,
} from "./rankedLineupsLayout";
import {
  parsePositionLabels,
  rankHeadlinePrimary,
  rankHeadlineSecondary,
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
  showTeamHairline = true,
  photoGrade = false,
  stripStat = "",
) => {
  context.save();
  context.fillStyle = "#111";
  context.fillRect(x, y, w, h);
  const inner = clipToInnerFrame(context, x, y, w, h, scale, look);
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
      context.save();
      context.filter = canvasGradeFilter(photoGrade);
      if (rotate) {
        context.translate(inner.x + inner.w / 2, inner.y + inner.h / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - (inner.x + inner.w / 2),
          dest.dy - (inner.y + inner.h / 2),
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      context.restore();
      applyPhotoGrade(
        context,
        inner.x,
        inner.y,
        inner.w,
        inner.h,
        photoGrade,
      );
      paintPhotoVignette(
        context,
        inner.x,
        inner.y,
        inner.w,
        inner.h,
        photoGrade,
      );
    }
  }
  context.restore();
  paintCellFrame(context, x, y, w, h, look, scale);
  if (showFade) {
    const line = frameLinePx(scale, look);
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
      stat: stripStat,
    });
  }
  if (showTeamHairline) {
    paintTeamHairline(context, x, y, w, h, look, scale, strip.teamId);
  }
};

export interface RankedLineupsRenderInput {
  brand: string;
  title: string;
  rank: string;
  strips: RankedLineupStrip[];
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  showFade?: boolean;
  showTeamHairline?: boolean;
  rankDisplay?: RankDisplay;
  positionLabels?: string[];
  story?: boolean;
  stripStats?: string[];
}

export const renderRankedLineupsCanvas = async (
  input: RankedLineupsRenderInput,
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

  await document.fonts?.ready.catch(() => undefined);
  await Promise.all([
    document.fonts?.load(`900 ${RL_TITLE_SIZE * scale}px ${POSTER_FONT}`),
  ]).catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);
  const s = scale;
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }
  if (!input.showBa) {
    withShadow(context, s, () => {
      context.font = `900 ${RL_BRAND_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      setLetterSpacing(context, 0.18 * RL_BRAND_SIZE * s);
      context.fillStyle = "#fff";
      context.fillText(input.brand.toUpperCase(), width / 2, 26 * s);
      setLetterSpacing(context, 0);
    });
  }

  const plate = {
    x: RL_TITLE_BOX_X * s,
    y: RL_BRAND_H * s,
    w: width - RL_TITLE_BOX_X * 2 * s,
    h: RL_TITLE_BOX_H * s,
  };
  drawBannerInterior(context, plate.x, plate.y, plate.w, plate.h, s, () => {
    context.beginPath();
    context.rect(plate.x, plate.y, plate.w, plate.h);
  });
  paintCellFrame(context, plate.x, plate.y, plate.w, plate.h, input.look, s);
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, plate.x, plate.y, plate.w, plate.h, s);
  }

  const titleLines = splitRankedLineupTitle(input.title);
  const lineH = RL_TITLE_SIZE * RL_TITLE_LINE * s;
  const titleInner = innerFrameRect(plate.x, plate.y, plate.w, plate.h, s, input.look);
  const titlePadX = RL_TITLE_PAD_X * s;
  const titlePadY = RL_TITLE_PAD_Y * s;
  context.save();
  context.beginPath();
  context.rect(
    titleInner.x + titlePadX,
    titleInner.y + titlePadY,
    titleInner.w - titlePadX * 2,
    titleInner.h - titlePadY * 2,
  );
  context.clip();
  const titleBlock = lineH * titleLines.length;
  let titleY = plate.y + (plate.h - titleBlock) / 2 + lineH / 2;
  context.font = `900 ${RL_TITLE_SIZE * s}px ${POSTER_FONT}`;
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
        1.2 * s,
      );
    });
    titleY += lineH;
  });
  setLetterSpacing(context, 0);
  context.restore();

  const rankDisplay: RankDisplay =
    input.rankDisplay === "headline"
      ? "headline"
      : input.rankDisplay === "none"
        ? "none"
        : "pill";
  const rankText = input.rank.trim().toUpperCase() || "BEST";
  if (rankDisplay === "none") {
    /* unranked 5-man — no BEST / #1 pill */
  } else if (rankDisplay === "pill") {
    context.font = `900 ${RL_PILL_SIZE * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.12 * RL_PILL_SIZE * s);
    const pillW = Math.max(
      148 * s,
      context.measureText(rankText).width + 44 * s,
    );
    const pillH = RL_PILL_H * s;
    const pillX = (width - pillW) / 2;
    const pillY = (RL_BRAND_H + RL_TITLE_BOX_H + RL_PILL_GAP) * s;
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
  } else {
    const headlineY = (RL_BRAND_H + RL_TITLE_BOX_H + 22) * s;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.font = `900 ${RL_HEADLINE_SIZE * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.04 * RL_HEADLINE_SIZE * s);
    withShadow(context, s, () => {
      context.fillText(rankHeadlinePrimary(input.rank), width / 2, headlineY);
    });
    setLetterSpacing(context, 0.18 * RL_HEADLINE_SUB_SIZE * s);
    context.font = `900 ${RL_HEADLINE_SUB_SIZE * s}px ${POSTER_FONT}`;
    context.fillStyle = "rgba(255,255,255,0.86)";
    context.fillText(
      rankHeadlineSecondary(input.rank),
      width / 2,
      headlineY + 22 * s,
    );
    setLetterSpacing(context, 0);
  }

  const stripCount = input.strips.length || RANKED_LINEUP_STRIP_COUNT;
  const stripW = RL_STRIP_W * s;
  for (let index = 0; index < stripCount; index += 1) {
    const rect = rankedStripRect(
      index,
      stripCount,
      rankDisplay,
      input.showFade === true,
      boardH,
    );
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
      rect.x * s,
      rect.y * s,
      rect.w * s,
      rect.h * s,
      s,
      input.look,
      input.showFade === true,
      input.showTeamHairline !== false,
      input.photoGrade === true,
      input.stripStats?.[index] ?? "",
    );
    if (input.purpleFlair) {
      paintPurpleInnerHairline(
        context,
        rect.x * s,
        rect.y * s,
        rect.w * s,
        rect.h * s,
        s,
        input.look,
      );
    }
  }

  const footerUnit = rankedFooterH(input.showFade === true);
  const footerRows = Math.max(1, Math.ceil(stripCount / 5));
  const footerY = (boardH - footerUnit * footerRows) * s;
  const positionLabels = parsePositionLabels(input.positionLabels, stripCount);
  for (let index = 0; index < stripCount; index += 1) {
    const strip = input.strips[index];
    const row = Math.floor(index / 5);
    const x = rlStripX(index) * s;
    const cx = x + stripW / 2;
    const rowY = footerY + row * footerUnit * s;
    const pos = (positionLabels[index] ?? "").trim().toUpperCase();
    if (pos) {
      context.font = `900 ${16 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      setLetterSpacing(context, 0.06 * 16 * s);
      const pillH = 28 * s;
      const pillW = Math.min(
        stripW * 0.72,
        Math.max(48 * s, context.measureText(pos).width + 20 * s),
      );
      const pillX = cx - pillW / 2;
      const pillY = rowY + (RL_POS_H * s - pillH) / 2;
      roundRectPath(context, pillX, pillY, pillW, pillH, pillH / 2);
      context.fillStyle = "#fff";
      context.fill();
      context.fillStyle = "#111";
      context.fillText(pos, cx, pillY + pillH / 2);
      setLetterSpacing(context, 0);
    }

    if (input.showFade) {
      continue;
    }
    const styled = composerNameLines(
      strip?.firstName ?? "",
      strip?.lastName ?? "",
      readComposerNameStyle(),
    );
    const given = styled.given.trim().toUpperCase();
    const family = styled.family.trim().toUpperCase();
    const nameTop = rowY + RL_POS_H * s;
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
    const stat = (input.stripStats?.[index] ?? "").trim().toUpperCase();
    if (stat) {
      context.font = `800 ${10 * s}px ${POSTER_FONT}`;
      context.fillStyle = "rgba(255,255,255,0.82)";
      context.textBaseline = "top";
      context.fillText(stat, cx, nameTop + 58 * s, nameW);
    }
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
