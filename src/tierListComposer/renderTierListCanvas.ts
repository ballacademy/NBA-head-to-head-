import {
  HEADER_TEXTURE_SRC,
  drawCoveredTexture,
} from "../standingsComposer/headerTexture";
import {
  drawCenteredLogo,
  getOpaqueBounds,
} from "../standingsComposer/logoDraw";
import { GRAPHIC_BG } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { loadCorsImage } from "../lib/playerHeadshots";
import { getPlayer } from "./nbaActivePlayers";
import { drawCoverHeadshot } from "./PlayerHeadshot";
import {
  baBadgeRect,
  BA_LOGO_SRC,
  cellGridPosition,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  labelFontSize,
  PLAYER_LOGO_WATERMARK_ALPHA,
  PLAYER_LOGO_WATERMARK_OVERSCAN,
  TIER_CELL_GAP,
  TIER_CELLS_INSET,
  TIER_FOOTER,
  TIER_HEADER_H,
  TIER_LABEL_W,
  TIER_TITLE_SIZE,
  TIER_TITLE_TRACK,
  TIER_WRAP_COLS,
  tierBoardLayout,
} from "./tierLayout";
import {
  splitTierTitle,
  type TierRow,
  type TierSubject,
} from "./tierState";

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
  subject?: TierSubject;
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

  const ba = await loadImage(BA_LOGO_SRC);
  if (ba) {
    const slot = baBadgeRect();
    const badge = slot.size * scale;
    const badgeX = slot.x * scale;
    const badgeY = slot.y * scale;
    const bounds = getOpaqueBounds(ba);
    const fit = badge / Math.max(1, bounds.w, bounds.h);
    const dw = bounds.w * fit;
    const dh = bounds.h * fit;
    context.drawImage(
      ba,
      bounds.x,
      bounds.y,
      bounds.w,
      bounds.h,
      badgeX + (badge - dw) / 2,
      badgeY + (badge - dh) / 2,
      dw,
      dh,
    );
  }

  const layout = tierBoardLayout(input.rows.map((row) => row.teams.length));
  const subject = input.subject ?? "teams";
  const cellArt = await Promise.all(
    input.rows.map((row) =>
      Promise.all(
        row.teams.map(async (id) => {
          if (subject === "players") {
            const player = getPlayer(id);
            const team = player ? getTeam(player.team) : null;
            const [headshot, watermark] = await Promise.all([
              player ? loadCorsImage(player.headshotUrl) : Promise.resolve(null),
              team ? loadImage(team.logoSrc) : Promise.resolve(null),
            ]);
            return {
              mark: headshot,
              watermark,
              cacheKey: team?.logoSrc,
            };
          }
          const team = getTeam(id);
          return {
            mark: team ? await loadImage(team.logoSrc) : null,
            watermark: null,
            cacheKey: team?.logoSrc,
          };
        }),
      ),
    ),
  );

  let tierTop = TIER_HEADER_H;
  input.rows.forEach((row, rowIndex) => {
    const laneCount = layout.lanes[rowIndex] ?? 1;
    const y = tierTop * scale;
    const h = laneCount * layout.laneH * scale;
    context.fillStyle = "rgba(255, 255, 255, 0.2)";
    context.fillRect(0, y, width, Math.max(1, 1.5 * scale));

    const label = row.label.trim() || " ";
    const fontPx = labelFontSize(label) * scale;
    withDropShadow(context, scale, () => {
      context.font = `900 ${fontPx}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#fff";
      context.fillText(label, (TIER_LABEL_W / 2) * scale, y + h / 2);
    });

    const size = layout.size * scale;
    const gap = TIER_CELL_GAP * scale;
    const startX = (TIER_LABEL_W + TIER_CELLS_INSET) * scale;
    const wrapRows = Math.max(1, Math.ceil(row.teams.length / TIER_WRAP_COLS));
    const blockH = wrapRows * size + Math.max(0, wrapRows - 1) * gap;
    const startY = y + (h - blockH) / 2;

    row.teams.forEach((entityId, index) => {
      const player = subject === "players" ? getPlayer(entityId) : null;
      const team = player ? getTeam(player.team) : getTeam(entityId);
      const { col, wrapRow } = cellGridPosition(index);
      const x = startX + col * (size + gap);
      const cellY = startY + wrapRow * (size + gap);
      if (team) {
        fillCellGradient(
          context,
          x,
          cellY,
          size,
          size,
          team.cellFrom,
          team.cellTo,
        );
      } else {
        context.fillStyle = "#2a2a2a";
        context.fillRect(x, cellY, size, size);
      }
      const art = cellArt[rowIndex]?.[index];
      if (player && art?.watermark) {
        context.save();
        context.beginPath();
        context.rect(x, cellY, size, size);
        context.clip();
        context.globalAlpha = PLAYER_LOGO_WATERMARK_ALPHA;
        const overscan = size * PLAYER_LOGO_WATERMARK_OVERSCAN;
        drawCenteredLogo(
          context,
          art.watermark,
          x - overscan,
          cellY - overscan,
          size + overscan * 2,
          size + overscan * 2,
          {
            shadow: 0,
            fitX: 0.9,
            fitY: 0.9,
            cacheKey: art.cacheKey,
          },
        );
        context.restore();
      }
      if (art?.mark && player) {
        drawCoverHeadshot(context, art.mark, x, cellY, size, size);
      } else if (art?.mark && team) {
        drawCenteredLogo(context, art.mark, x, cellY, size, size, {
          cacheKey: team.logoSrc,
        });
      }
    });
    tierTop += laneCount * layout.laneH;
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
