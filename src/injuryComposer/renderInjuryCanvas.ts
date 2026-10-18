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
  INJURY_KICKER_FILL,
  INJURY_KICKER_INK,
  splitInjuryTitle,
  type InjuryDraft,
  type InjuryKicker,
} from "./injuryState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export type InjuryRenderInput = InjuryDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  story?: boolean;
};

export const renderInjuryCanvas = async (
  input: InjuryRenderInput,
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
    context.fillText(input.brand.toUpperCase(), width / 2, 34 * s);
  }
  const lines = splitInjuryTitle(input.title);
  context.font = `900 ${46 * s}px ${POSTER_FONT}`;
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, (92 + index * 48) * s);
  });

  const kicker = (input.kicker || "OUT / GTD").toUpperCase();
  context.font = `italic 900 ${22 * s}px ${POSTER_FONT}`;
  const kw = Math.min(420 * s, context.measureText(kicker).width + 36 * s);
  const kx = (width - kw) / 2;
  const ky = 188 * s;
  context.fillStyle = "#fff";
  context.fillRect(kx, ky, kw, 36 * s);
  context.fillStyle = "#111";
  context.fillText(kicker, width / 2, ky + 18 * s);

  context.fillStyle = "rgba(255,255,255,0.88)";
  context.font = `900 ${16 * s}px ${POSTER_FONT}`;
  context.fillText((input.dateLine || "").toUpperCase(), width / 2, 246 * s);

  const logos = await Promise.all(
    input.teams.map((block) => {
      const team = getTeam(block.teamId);
      return team ? loadImage(team.logoSrc) : Promise.resolve(null);
    }),
  );

  const cols = 2;
  const listTop = 272 * s;
  const colW = (width - 56 * s) / cols;
  const colY = [listTop, listTop];
  input.teams.forEach((block, index) => {
    const col = index % cols;
    const x = 28 * s + col * (colW + 12 * s);
    const y = colY[col];
    colY[col] += Math.max(56 * s, 22 * s + block.players.slice(0, 4).length * 16 * s);
    const logo = logos[index];
    if (logo) {
      drawCenteredLogo(context, logo, x, y, 44 * s, 44 * s, {
        cacheKey: `${block.teamId}-inj`,
        shadow: 0,
      });
    }
    context.textAlign = "center";
    context.fillStyle = "#fff";
    context.font = `900 ${11 * s}px ${POSTER_FONT}`;
    context.fillText(block.teamId, x + 22 * s, y + 52 * s);
    context.textAlign = "left";
    block.players.slice(0, 4).forEach((player, playerIndex) => {
      const py = y + playerIndex * 16 * s;
      const status = player.status as InjuryKicker;
      context.fillStyle = INJURY_KICKER_FILL[status] ?? "#fff";
      context.fillRect(x + 56 * s, py, 52 * s, 14 * s);
      context.fillStyle = INJURY_KICKER_INK[status] ?? "#111";
      context.font = `italic 900 ${9 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.fillText(player.status, x + 82 * s, py + 7 * s);
      context.textAlign = "left";
      context.fillStyle = "#fff";
      context.font = `900 ${12 * s}px ${POSTER_FONT}`;
      context.fillText(player.shortName.toUpperCase(), x + 114 * s, py + 7 * s);
    });
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
