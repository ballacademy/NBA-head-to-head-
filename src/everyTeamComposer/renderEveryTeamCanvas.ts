import {
  BANNER_STROKE_VB,
  BRAND_FONT,
  BRAND_TRACKING_EM,
  bannerBoardRect,
  brandBaselineY,
} from "../standingsComposer/bannerLayout";
import {
  HEADER_TEXTURE_SRC,
  drawBannerInterior,
  drawCoveredTexture,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { GRAPHIC_BG } from "../standingsComposer/rankingState";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { loadCorsImage } from "../lib/playerHeadshots";
import { drawCoverHeadshot } from "../tierListComposer/PlayerHeadshot";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  ET_BORDER,
  ET_LOGO_FIT,
  ET_TITLE_SIZE,
  ET_TITLE_TRACK,
  everyTeamBannerRectPath,
  everyTeamCellRect,
  everyTeamGrid,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "./everyTeamLayout";
import {
  EVERY_TEAM_ORDER,
  splitEveryTeamTitle,
  type EveryTeamSlots,
} from "./everyTeamState";

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

const withDropShadow = (
  context: CanvasRenderingContext2D,
  scale: number,
  paint: () => void,
) => {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.78)";
  context.shadowOffsetX = Math.round(1.2 * scale);
  context.shadowOffsetY = Math.round(1.5 * scale);
  context.shadowBlur = 0;
  paint();
  context.restore();
};

const drawTrackedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  tracking: number,
  fill: string,
) => {
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = fill;
  if (setLetterSpacing(context, tracking)) {
    context.fillText(text, Math.round(x), Math.round(y));
    setLetterSpacing(context, 0);
    return;
  }
  context.fillText(text, Math.round(x), Math.round(y));
};

const drawBannerRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const box = everyTeamBannerRectPath(x, y, w, h);
  context.beginPath();
  context.moveTo(box.left, box.top);
  context.lineTo(box.right, box.top);
  context.lineTo(box.right, box.bottom);
  context.lineTo(box.left, box.bottom);
  context.closePath();
};

export interface EveryTeamRenderInput {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
}

export const renderEveryTeamCanvas = async (
  input: EveryTeamRenderInput,
  scale = 2,
): Promise<HTMLCanvasElement> => {
  if (typeof document !== "undefined" && document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`900 ${BRAND_FONT * scale}px ${POSTER_FONT}`),
      document.fonts.load(`900 ${ET_TITLE_SIZE * scale}px ${POSTER_FONT}`),
    ]).catch(() => undefined);
  }

  const width = GRAPHIC_WIDTH * scale;
  const height = GRAPHIC_HEIGHT * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open export canvas");
  }

  context.fillStyle = GRAPHIC_BG;
  context.fillRect(0, 0, width, height);

  const metal = await loadImage(HEADER_TEXTURE_SRC);
  if (metal) {
    drawCoveredTexture(context, metal, 0, 0, width, height);
  }

  withDropShadow(context, scale, () => {
    drawTrackedText(
      context,
      input.brand.trim() || " ",
      width / 2,
      brandBaselineY(scale),
      `900 ${BRAND_FONT * scale}px ${POSTER_FONT}`,
      BRAND_TRACKING_EM * BRAND_FONT * scale,
      "#fff",
    );
  });

  const board = bannerBoardRect(scale);
  const buildBannerPath = () =>
    drawBannerRect(context, board.x, board.y, board.w, board.h);
  drawBannerInterior(
    context,
    board.x,
    board.y,
    board.w,
    board.h,
    scale,
    buildBannerPath,
  );
  buildBannerPath();
  context.strokeStyle = "#fff";
  context.lineWidth = (BANNER_STROKE_VB / 200) * board.h;
  context.lineJoin = "miter";
  context.stroke();

  const titleLines = splitEveryTeamTitle(input.title);
  const titleFont = `900 ${ET_TITLE_SIZE * scale}px ${POSTER_FONT}`;
  const titleTracking = ET_TITLE_TRACK * ET_TITLE_SIZE * scale;
  const lineH = ET_TITLE_SIZE * 1.12 * scale;
  const box = everyTeamBannerRectPath(board.x, board.y, board.w, board.h);
  const blockH = lineH * titleLines.length;
  const titleTop = (box.top + box.bottom) / 2 - blockH / 2 + lineH / 2;

  withDropShadow(context, scale, () => {
    titleLines.forEach((line, index) => {
      context.font = titleFont;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      context.strokeStyle = "#000";
      context.lineWidth = 2 * scale;
      const y = titleTop + index * lineH;
      if (setLetterSpacing(context, titleTracking)) {
        context.strokeText(line, width / 2, y);
        context.fillStyle = "#fff";
        context.fillText(line, width / 2, y);
        setLetterSpacing(context, 0);
      } else {
        context.strokeText(line, width / 2, y);
        context.fillStyle = "#fff";
        context.fillText(line, width / 2, y);
      }
    });
  });

  const grid = everyTeamGrid(scale);
  const art = await Promise.all(
    EVERY_TEAM_ORDER.map(async (team, index) => {
      const player = getPlayer(input.slots[index] ?? null);
      const shown = player && player.team === team.id ? player : null;
      const [logo, headshot] = await Promise.all([
        loadImage(team.logoSrc),
        shown ? loadCorsImage(shown.headshotUrl) : Promise.resolve(null),
      ]);
      return { team, logo, headshot };
    }),
  );

  art.forEach((cell, index) => {
    const { x, y, size } = everyTeamCellRect(index, grid);
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, cell.team.cellFrom);
    gradient.addColorStop(1, cell.team.cellTo);
    context.fillStyle = gradient;
    context.fillRect(x, y, size, size);
    if (cell.logo) {
      context.save();
      context.beginPath();
      context.rect(x, y, size, size);
      context.clip();
      drawCenteredLogo(context, cell.logo, x, y, size, size, {
        shadow: 0,
        fitX: ET_LOGO_FIT,
        fitY: ET_LOGO_FIT,
        cacheKey: cell.team.logoSrc,
      });
      context.restore();
    }
    if (cell.headshot) {
      drawCoverHeadshot(context, cell.headshot, x, y, size, size);
    }
    context.strokeStyle = cell.team.cellFrom;
    context.lineWidth = ET_BORDER * scale;
    context.strokeRect(
      x + (ET_BORDER * scale) / 2,
      y + (ET_BORDER * scale) / 2,
      size - ET_BORDER * scale,
      size - ET_BORDER * scale,
    );
  });

  return canvas;
};
