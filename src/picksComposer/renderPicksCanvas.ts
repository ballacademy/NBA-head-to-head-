import {
  paintCellFrame,
  paintPurpleBaGlow,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  formatPicksGameLine,
  PICKS_CHECK_FILL,
  picksFillLayout,
  splitPicksTitle,
  type PicksDraft,
  type PicksSide,
} from "./picksState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export type PicksRenderInput = PicksDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  story?: boolean;
};

const paintCheck = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  scale: number,
) => {
  context.save();
  context.fillStyle = PICKS_CHECK_FILL;
  context.beginPath();
  context.arc(x, y, size / 2, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#0a0a0a";
  context.lineWidth = Math.max(1, 1.5 * scale);
  context.stroke();
  context.strokeStyle = "#fff";
  context.lineWidth = Math.max(2, 2.6 * scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(x - size * 0.2, y + size * 0.02);
  context.lineTo(x - size * 0.04, y + size * 0.18);
  context.lineTo(x + size * 0.22, y - size * 0.16);
  context.stroke();
  context.restore();
};

export const renderPicksCanvas = async (
  input: PicksRenderInput,
  scale = 2,
): Promise<HTMLCanvasElement> => {
  const width = GRAPHIC_WIDTH * scale;
  const boardH = input.story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
  const height = boardH * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return canvas;
  }
  const s = scale;
  paintBoardField(context, await loadImage(FIELD_TEXTURE_SRC), width, height);
  paintCellFrame(context, 0, 0, width, height, input.look, s);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  if (!input.showBa) {
    context.font = `900 ${22 * s}px ${POSTER_FONT}`;
    context.shadowColor = "rgba(0,0,0,0.82)";
    context.shadowOffsetX = 1 * s;
    context.shadowOffsetY = 1.2 * s;
    context.fillText(input.brand.toUpperCase(), width / 2, 34 * s);
    context.shadowColor = "transparent";
  }
  const lines = splitPicksTitle(input.title);
  context.font = `900 ${58 * s}px ${POSTER_FONT}`;
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, (96 + index * 58) * s);
  });
  context.font = `900 ${16 * s}px ${POSTER_FONT}`;
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.fillText((input.dateLine || "").toUpperCase(), width / 2, 196 * s);

  const fill = picksFillLayout(input.games.length, boardH);
  const needed = new Set<string>();
  input.games.forEach((game) => {
    if (game.awayId) {
      needed.add(game.awayId);
    }
    if (game.homeId) {
      needed.add(game.homeId);
    }
  });
  const logos = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    [...needed].map(async (id) => {
      const team = getTeam(id);
      logos.set(id, team ? await loadImage(team.logoSrc) : null);
    }),
  );

  const logo = fill.logo * s;
  const check = fill.check * s;
  const midX = width / 2;
  const leftLogoX = 72 * s;
  const rightLogoX = width - 72 * s - logo;
  const leftCheckX = leftLogoX + logo + 28 * s + check / 2;
  const rightCheckX = rightLogoX - 28 * s - check / 2;

  const paintSide = (
    teamId: string,
    x: number,
    y: number,
    color: string,
  ) => {
    const image = logos.get(teamId);
    if (image) {
      drawCenteredLogo(context, image, x, y - logo / 2, logo, logo, {
        cacheKey: `${teamId}-pk`,
        shadow: 0,
      });
    }
    context.textAlign = "center";
    context.fillStyle = color;
    context.font = `900 ${fill.name * s}px ${POSTER_FONT}`;
    context.fillText(
      teamId || "TEAM",
      x + logo / 2,
      y + logo / 2 + fill.name * 0.7 * s,
    );
  };

  input.games.forEach((game, index) => {
    const y =
      (fill.listTop + index * (fill.rowH + fill.gap) + fill.rowH / 2) * s;
    paintSide(game.awayId, leftLogoX, y, "#93c5fd");
    paintSide(game.homeId, rightLogoX, y, "#fde68a");
    const paintSideCheck = (side: PicksSide, x: number) => {
      if (game.pick !== side) {
        return;
      }
      paintCheck(context, x, y, check, s);
    };
    paintSideCheck("away", leftCheckX);
    paintSideCheck("home", rightCheckX);
    const line = formatPicksGameLine(game);
    if (line) {
      context.textAlign = "center";
      context.fillStyle = "#fff";
      context.font = `900 ${fill.line * s}px ${POSTER_FONT}`;
      context.fillText(line, midX, y);
    }
  });

  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 56 * s;
      const inset = 24 * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }
  return canvas;
};
