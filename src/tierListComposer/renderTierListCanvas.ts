import {
  HEADER_TEXTURE_SRC,
  drawCoveredTexture,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { GRAPHIC_BG } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import {
  cellSize,
  cellsContentWidth,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  labelFontSize,
  rowMetrics,
  TIER_BADGE_SIZE,
  TIER_CELL_GAP,
  TIER_CELLS_INSET,
  TIER_FOOTER,
  TIER_HEADER_H,
  TIER_LABEL_W,
  TIER_PAD_RIGHT,
  TIER_TITLE_SIZE,
  TIER_TITLE_TRACK,
} from "./tierLayout";
import { splitTierTitle, type TierRow } from "./tierState";

export { canvasToPngBlob };

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const fillCellGradient = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  from: string,
  to: string,
) => {
  const gradient = context.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  context.fillStyle = gradient;
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

const drawCenteredLine = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  tracking: number,
) => {
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  if (setLetterSpacing(context, tracking)) {
    context.fillText(text, Math.round(x), Math.round(y));
    setLetterSpacing(context, 0);
    return;
  }
  context.fillText(text, Math.round(x), Math.round(y));
};

export interface TierListRenderInput {
  title: string;
  rows: TierRow[];
}

export const renderTierListCanvas = async (
  input: TierListRenderInput,
  scale = 2,
): Promise<HTMLCanvasElement> => {
  if (typeof document !== "undefined" && document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`900 ${TIER_TITLE_SIZE * scale}px ${POSTER_FONT}`),
      document.fonts.load(`900 ${76 * scale}px ${POSTER_FONT}`),
      document.fonts.load(`900 ${28 * scale}px ${POSTER_FONT}`),
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
    context.save();
    context.globalAlpha = 0.16;
    drawCoveredTexture(context, metal, 0, 0, width, height);
    context.restore();
  }

  const vignette = context.createRadialGradient(
    width / 2,
    height * 0.42,
    height * 0.12,
    width / 2,
    height * 0.5,
    height * 0.78,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  const titleLines = splitTierTitle(input.title);
  const titleFont = `900 ${TIER_TITLE_SIZE * scale}px ${POSTER_FONT}`;
  const titleTracking = TIER_TITLE_TRACK * TIER_TITLE_SIZE * scale;
  const lineH = TIER_TITLE_SIZE * 1.12 * scale;
  const titleBlockH = lineH * titleLines.length;
  const titleTop = (TIER_HEADER_H * scale - titleBlockH) / 2 + lineH / 2;

  withDropShadow(context, scale, () => {
    titleLines.forEach((line, index) => {
      drawCenteredLine(
        context,
        line,
        width / 2,
        titleTop + index * lineH,
        titleFont,
        titleTracking,
      );
    });
  });

  const badge = TIER_BADGE_SIZE * scale;
  const badgeX = width - TIER_PAD_RIGHT * scale - badge;
  const badgeY = (TIER_HEADER_H * scale - badge) / 2;
  context.beginPath();
  context.arc(badgeX + badge / 2, badgeY + badge / 2, badge / 2, 0, Math.PI * 2);
  context.fillStyle = "#111111";
  context.fill();
  context.lineWidth = 3 * scale;
  context.strokeStyle = "#fff";
  context.stroke();
  withDropShadow(context, scale, () => {
    context.font = `900 ${22 * scale}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.fillText("BA", badgeX + badge / 2, badgeY + badge / 2 + 1 * scale);
  });

  const { rowH } = rowMetrics(input.rows.length);
  const contentW = cellsContentWidth();
  const logos = await Promise.all(
    input.rows.map((row) =>
      Promise.all(
        row.teams.map((id) => {
          const team = getTeam(id);
          return team ? loadImage(team.logoSrc) : Promise.resolve(null);
        }),
      ),
    ),
  );

  input.rows.forEach((row, rowIndex) => {
    const y = (TIER_HEADER_H + rowH * rowIndex) * scale;
    const h = rowH * scale;
    const hairY = y + (rowIndex === 0 ? 0 : 0);
    context.fillStyle = "rgba(255, 255, 255, 0.2)";
    context.fillRect(0, hairY, width, Math.max(1, 1.5 * scale));

    const label = row.label.trim() || " ";
    const fontPx = labelFontSize(label) * scale;
    withDropShadow(context, scale, () => {
      context.font = `900 ${fontPx}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#fff";
      context.fillText(label, (TIER_LABEL_W / 2) * scale, y + h / 2);
    });

    const slotCount = Math.max(1, row.teams.length);
    const size = cellSize(rowH, contentW, slotCount) * scale;
    const gap = TIER_CELL_GAP * scale;
    const startX = (TIER_LABEL_W + TIER_CELLS_INSET) * scale;
    const startY = y + (h - size) / 2;

    row.teams.forEach((teamId, index) => {
      const team = getTeam(teamId);
      const x = startX + index * (size + gap);
      if (team) {
        fillCellGradient(
          context,
          x,
          startY,
          size,
          size,
          team.cellFrom,
          team.cellTo,
        );
      } else {
        context.fillStyle = "#2a2a2a";
        context.fillRect(x, startY, size, size);
      }
      const logo = logos[rowIndex]?.[index];
      if (logo && team) {
        drawCenteredLogo(context, logo, x, startY, size, size, {
          cacheKey: team.logoSrc,
        });
      }
    });
  });

  context.fillStyle = "rgba(255, 255, 255, 0.2)";
  context.fillRect(
    0,
    (GRAPHIC_HEIGHT - TIER_FOOTER) * scale,
    width,
    Math.max(1, 1.5 * scale),
  );

  return canvas;
};
