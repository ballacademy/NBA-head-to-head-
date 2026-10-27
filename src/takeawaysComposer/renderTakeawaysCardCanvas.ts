import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { drawPlayerNameFade } from "../instagramComposer/drawPlayerNameFade";
import { applyPhotoGrade, canvasGradeFilter } from "../instagramComposer/photoGrade";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { getTeamColors } from "../lib/teamColors";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  paintBoardField,
  paintStuddedCharcoal,
} from "../standingsComposer/headerTexture";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  SCC_BA_INSET,
  SCC_BA_SIZE,
} from "../statCardCoverComposer/statCardCoverLayout";
import {
  TK_FACT_SIZE,
  TK_INDEX_SIZE,
  TK_LINE2_SIZE,
  TK_LINE_SIZE,
  TK_NAME_H,
  TK_WELL_H,
  TK_WELL_PAD_X,
} from "./takeawaysLayout";
import {
  takeawaysCardName,
  takeawaysWeekPill,
  type TakeawaysDraft,
} from "./takeawaysState";
import type { TakeawaysRenderInput } from "./renderTakeawaysCoverCanvas";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const wrapLine = (
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

export const renderTakeawaysCardCanvas = async (
  input: TakeawaysRenderInput,
  scale = 2,
  cardIndex = input.currentIndex,
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
  const s = scale;
  const card = input.cards[cardIndex] ?? input.cards[0];
  if (!card) {
    context.fillStyle = "#050505";
    context.fillRect(0, 0, width, height);
    paintCellFrame(context, 0, 0, width, height, input.look, s);
    return canvas;
  }
  const overlay = input.well === "overlay";
  const bleed = overlay || input.well === "fade";
  const wellH = (overlay ? 280 : TK_WELL_H) * s;
  const photoH = bleed ? height : height - wellH;
  context.fillStyle = "#050505";
  context.fillRect(0, 0, width, height);
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }
  if (card.photoSrc) {
    const photo = card.photoSrc.startsWith("data:")
      ? await loadImage(card.photoSrc)
      : await loadCorsImage(card.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        0,
        0,
        width,
        photoH,
        card.pan.x,
        card.pan.y,
        photoZoom(card.pan),
      );
      const rotate = photoRotate(card.pan);
      context.save();
      context.beginPath();
      context.rect(0, 0, width, photoH);
      context.clip();
      context.filter = canvasGradeFilter(input.photoGrade === true);
      if (rotate) {
        context.translate(width / 2, photoH / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - width / 2,
          dest.dy - photoH / 2,
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      context.restore();
      applyPhotoGrade(context, 0, 0, width, photoH, input.photoGrade === true);
      paintPhotoVignette(context, 0, 0, width, photoH, input.photoGrade === true);
    }
  }
  const wellY = height - wellH;
  if (input.well === "metal") {
    const metal = await loadCorsImage("/composer-background-texture.png");
    context.save();
    context.beginPath();
    context.rect(0, wellY, width, wellH);
    context.clip();
    paintBoardField(context, metal, width, height);
    context.restore();
  } else if (input.well === "charcoal") {
    paintStuddedCharcoal(context, 0, wellY, width, wellH, s);
  } else if (input.well === "team") {
    const fill = getTeamColors(card.teamId ?? "").primary;
    const grad = context.createLinearGradient(0, wellY, 0, height);
    grad.addColorStop(0, fill);
    grad.addColorStop(1, fill);
    context.fillStyle = grad;
    context.fillRect(0, wellY, width, wellH);
  } else {
    const fade = context.createLinearGradient(0, wellY, 0, height);
    fade.addColorStop(0, "rgba(7,7,7,0)");
    fade.addColorStop(0.28, "rgba(7,7,7,0.55)");
    fade.addColorStop(0.58, "rgba(7,7,7,0.96)");
    fade.addColorStop(1, "#070707");
    context.fillStyle = fade;
    context.fillRect(0, wellY, width, wellH);
  }
  const team = getTeam(card.teamId);
  if (card.playerId || takeawaysCardName(card)) {
    const logo = team ? await loadImage(team.logoSrc) : null;
    drawPlayerNameFade(context, {
      x: 0,
      y: (bleed ? height - wellH : photoH) - TK_NAME_H * s,
      w: width,
      h: TK_NAME_H * s,
      given: card.firstName,
      family: card.lastName,
      logo,
      logoSrc: team?.logoSrc,
      logoSize: 44 * s,
      familySize: 28 * s,
      givenSize: 20 * s,
      scale: s,
    });
  }
  const padX = TK_WELL_PAD_X * s;
  let textY = height - 48 * s;
  context.textAlign = "left";
  context.textBaseline = "bottom";
  context.fillStyle = "#fff";
  if (card.line2.trim()) {
    context.font = `900 ${TK_LINE2_SIZE * s}px ${POSTER_FONT}`;
    const lines = wrapLine(
      context,
      card.line2.toUpperCase(),
      width - padX * 2,
      2,
    );
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      context.fillText(lines[i]!, padX, textY);
      textY -= TK_LINE2_SIZE * 1.05 * s;
    }
    textY -= 8 * s;
  }
  if (card.line1.trim()) {
    context.font = `900 ${TK_LINE_SIZE * s}px ${POSTER_FONT}`;
    const lines = wrapLine(
      context,
      card.line1.toUpperCase(),
      width - padX * 2,
      2,
    );
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      context.fillText(lines[i]!, padX, textY);
      textY -= TK_LINE_SIZE * 1.02 * s;
    }
  }
  if (input.showFactChip && card.fact.trim()) {
    context.font = `900 ${TK_FACT_SIZE * s}px ${POSTER_FONT}`;
    const fact = card.fact.trim().toUpperCase();
    const factW = context.measureText(fact).width + 28 * s;
    const factH = 36 * s;
    textY -= 16 * s;
    context.strokeStyle = "rgba(255,255,255,0.82)";
    context.lineWidth = 2 * s;
    context.beginPath();
    context.roundRect(padX, textY - factH, factW, factH, factH / 2);
    context.stroke();
    context.fillStyle = "#fff";
    context.textBaseline = "middle";
    context.fillText(fact, padX + 14 * s, textY - factH / 2);
  }
  if (input.showIndex) {
    context.font = `900 ${TK_INDEX_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillStyle = "rgba(255,255,255,0.88)";
    context.fillText(
      `${cardIndex + 1} / ${Math.max(1, input.cards.length)}`,
      28 * s,
      28 * s,
    );
  }
  if (input.showWeekGhost) {
    context.font = `900 ${14 * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillStyle = "rgba(255,255,255,0.62)";
    context.fillText(takeawaysWeekPill(input), width / 2, 28 * s);
  }
  paintCellFrame(context, 0, 0, width, height, input.look, s);
  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = SCC_BA_SIZE * s;
      const inset = SCC_BA_INSET * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }
  return canvas;
};

export type { ComposerLook };
