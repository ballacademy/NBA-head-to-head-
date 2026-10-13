import {
  clipToInnerFrame,
  paintCellFrame,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { normalizeComposerTitle } from "../instagramComposer/titleLayout";
import {
  FIELD_TEXTURE_SRC,
  drawBannerInterior,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PLB_ALT_FILL,
  PLB_GAP,
  PLB_HAIRLINE,
  PLB_INK,
  PLB_LIST_INSET,
  PLB_PAD_BOTTOM,
  PLB_PAD_TOP,
  PLB_PAD_X,
  PLB_PIP_BAR_H,
  PLB_PIP_BAR_W,
  PLB_PIP_SIZE,
  PLB_PIP_W,
  PLB_POTD_FILL,
  PLB_RANK_W,
  PLB_ROW_H,
  PLB_ROW_SIZE,
  PLB_ROW_TRACK,
  PLB_STROKE,
  PLB_TITLE_H,
  PLB_TITLE_PAD,
  PLB_TITLE_SIZE,
  PLB_TITLE_TRACK,
  PLB_YELLOW,
  leaderboardBlankCount,
  leaderboardRowH,
} from "./potdLeaderboardLayout";
import {
  DEFAULT_POTD_LEADERBOARD_TITLE,
  isPotdPairName,
  rankLeaderboard,
  type LeaderboardEntry,
} from "./potdLeaderboardState";

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
  if (strokeWidth > 0) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.strokeText(text, x, y);
  }
  context.fillStyle = fill;
  context.fillText(text, x, y);
};

const paintStuddedBox = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) => {
  drawBannerInterior(context, x, y, w, h, scale, () => {
    context.beginPath();
    context.rect(x, y, w, h);
  });
};

export interface PotdLeaderboardRenderInput {
  title: string;
  entries: LeaderboardEntry[];
  look?: ComposerLook;
  showBa?: boolean;
  showPips?: boolean;
  potdKeys?: string[];
}

export const renderPotdLeaderboardCanvas = async (
  input: PotdLeaderboardRenderInput,
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
  await document.fonts
    ?.load(`900 ${PLB_TITLE_SIZE * scale}px ${POSTER_FONT}`)
    .catch(() => undefined);

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height);

  const s = scale;
  const titleX = PLB_PAD_X * s;
  const titleY = PLB_PAD_TOP * s;
  const titleW = width - titleX * 2;
  const titleH = PLB_TITLE_H * s;
  const listY = titleY + titleH + PLB_GAP * s;
  const listX = titleX;
  const listW = titleW;
  const listH = height - listY - PLB_PAD_BOTTOM * s;
  const stroke = PLB_STROKE * s;
  const showPips = input.showPips !== false;
  const potdKeys = input.potdKeys ?? [];

  paintStuddedBox(context, titleX, titleY, titleW, titleH, s);
  paintCellFrame(context, titleX, titleY, titleW, titleH, input.look, s);

  const title = normalizeComposerTitle(
    input.title,
    DEFAULT_POTD_LEADERBOARD_TITLE,
  );
  context.save();
  const titleInner = clipToInnerFrame(
    context,
    titleX,
    titleY,
    titleW,
    titleH,
    s,
  );
  const titlePad = PLB_TITLE_PAD * s;
  context.beginPath();
  context.rect(
    titleInner.x + titlePad,
    titleInner.y + titlePad,
    titleInner.w - titlePad * 2,
    titleInner.h - titlePad * 2,
  );
  context.clip();
  context.font = `900 ${PLB_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, PLB_TITLE_TRACK * PLB_TITLE_SIZE * s);
  strokeFillText(
    context,
    title,
    titleX + titleW / 2,
    titleY + titleH / 2,
    PLB_YELLOW,
    PLB_INK,
    5 * s,
  );
  setLetterSpacing(context, 0);
  context.restore();

  paintStuddedBox(context, listX, listY, listW, listH, s);
  context.strokeStyle = PLB_YELLOW;
  context.lineWidth = stroke;
  context.strokeRect(
    listX + stroke / 2,
    listY + stroke / 2,
    listW - stroke,
    listH - stroke,
  );

  const ranked = rankLeaderboard(input.entries);
  const blanks = leaderboardBlankCount(ranked);
  const inset = PLB_LIST_INSET * s;
  const innerX = listX + inset;
  const innerW = listW - inset * 2;
  const innerY = listY + 18 * s;
  const pipW = showPips ? PLB_PIP_W * s : 0;
  const rankW = PLB_RANK_W * s;
  const nameX = innerX + pipW + rankW;
  const logos = new Map<string, HTMLImageElement>();
  if (showPips) {
    const ids = [
      ...new Set(ranked.map((entry) => entry.teamId).filter(Boolean)),
    ] as string[];
    await Promise.all(
      ids.map(async (id) => {
        const team = getTeam(id);
        if (!team) {
          return;
        }
        const image = await loadImage(team.logoSrc);
        if (image) {
          logos.set(id, image);
        }
      }),
    );
  }

  const paintHairlineRow = (top: number, rowH: number, index: number) => {
    if (index % 2 === 1) {
      context.fillStyle = PLB_ALT_FILL;
      context.fillRect(innerX, top, innerW, rowH);
    }
    context.strokeStyle = PLB_HAIRLINE;
    context.lineWidth = Math.max(1, s * 0.5);
    context.beginPath();
    context.moveTo(innerX, top + rowH);
    context.lineTo(innerX + innerW, top + rowH);
    context.stroke();
  };

  let cursorY = innerY;
  ranked.forEach((entry, index) => {
    const rowH = leaderboardRowH(entry.displayLines.length > 1) * s;
    const top = cursorY;
    cursorY += rowH;
    const y = top + rowH / 2;
    paintHairlineRow(top, rowH, index);
    if (isPotdPairName(entry.name, potdKeys)) {
      context.fillStyle = PLB_POTD_FILL;
      context.fillRect(innerX, top, innerW, rowH);
      context.fillStyle = PLB_YELLOW;
      context.fillRect(innerX, top + 4 * s, 4 * s, rowH - 8 * s);
    }

    if (showPips) {
      const pipSize = Math.min(PLB_PIP_SIZE * s, rowH - 8 * s);
      const pipX = innerX + (pipW - pipSize) / 2;
      const pipY = y - pipSize / 2;
      const logo = entry.teamId ? logos.get(entry.teamId) : undefined;
      if (logo) {
        context.save();
        context.beginPath();
        context.rect(pipX, pipY, pipSize, pipSize);
        context.clip();
        drawCenteredLogo(context, logo, pipX, pipY, pipSize, pipSize, {
          fitX: 0.88,
          fitY: 0.88,
          cacheKey: entry.teamId ?? undefined,
          shadow: 0,
        });
        context.restore();
      } else {
        const barW = PLB_PIP_BAR_W * s;
        const barH = Math.min(PLB_PIP_BAR_H * s, rowH - 12 * s);
        const team = entry.teamId ? getTeam(entry.teamId) : null;
        context.fillStyle = team?.cellFrom ?? "rgba(245, 196, 0, 0.55)";
        context.fillRect(
          innerX + (pipW - barW) / 2,
          y - barH / 2,
          barW,
          barH,
        );
      }
    }

    const size = PLB_ROW_SIZE * entry.nameScale * s;
    context.font = `900 ${size}px ${POSTER_FONT}`;
    context.textBaseline = "middle";
    setLetterSpacing(context, PLB_ROW_TRACK * size);
    context.fillStyle = PLB_YELLOW;
    context.textAlign = "left";
    context.fillText(entry.rankLabel, innerX + pipW, y);
    const lines = entry.displayLines.filter(Boolean);
    if (lines.length > 1) {
      const step = size * 0.95;
      lines.forEach((line, lineIndex) => {
        context.fillText(
          line,
          nameX,
          y - step / 2 + lineIndex * step,
        );
      });
    } else {
      context.fillText(entry.displayName || entry.name.toUpperCase(), nameX, y);
    }
    context.textAlign = "right";
    context.fillText(entry.winsLabel, innerX + innerW, y);
    setLetterSpacing(context, 0);
  });

  for (let index = 0; index < blanks; index += 1) {
    const rowH = PLB_ROW_H * s;
    paintHairlineRow(cursorY, rowH, ranked.length + index);
    cursorY += rowH;
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
