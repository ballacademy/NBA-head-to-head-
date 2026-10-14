import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { playInSeeds, type PlayInDraft } from "./playInState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export type PlayInRenderInput = PlayInDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
};

export const renderPlayInCanvas = async (
  input: PlayInRenderInput,
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
  const s = scale;
  paintBoardField(context, await loadImage(FIELD_TEXTURE_SRC), width, height);
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }

  context.font = `900 ${52 * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "#000";
  context.lineWidth = 3 * s;
  const title = input.title.trim().toUpperCase() || "NBA PLAY-IN";
  context.strokeText(title, width / 2, 80 * s);
  context.fillStyle = "#fff";
  context.fillText(title, width / 2, 80 * s);

  const seeds = playInSeeds(input.size);
  const colW = 520 * s;
  const gap = 36 * s;
  const originY = 160 * s;
  const colH = height - originY - 48 * s;
  const slotH = (colH - 40 * s - (seeds.length - 1) * 16 * s) / seeds.length;

  const paintCol = async (
    x: number,
    label: string,
    ids: Array<string | null>,
  ) => {
    context.font = `900 ${22 * s}px ${POSTER_FONT}`;
    context.fillStyle = "#fff";
    context.fillText(label, x + colW / 2, originY + 16 * s);
    for (let index = 0; index < seeds.length; index += 1) {
      const y = originY + 40 * s + index * (slotH + 16 * s);
      context.fillStyle = "rgba(12,12,14,0.55)";
      context.fillRect(x, y, colW, slotH);
      paintCellFrame(context, x, y, colW, slotH, input.look, s);
      context.font = `900 ${22 * s}px ${POSTER_FONT}`;
      context.textAlign = "left";
      context.fillStyle = "#fff";
      context.fillText(String(seeds[index]), x + 14 * s, y + 28 * s);
      context.textAlign = "center";
      const team = getTeam(ids[index]);
      if (team) {
        const logo = await loadImage(team.logoSrc);
        if (logo) {
          const mark = Math.min(colW, slotH) * 0.62;
          drawCenteredLogo(
            context,
            logo,
            x + (colW - mark) / 2,
            y + (slotH - mark) / 2,
            mark,
            mark,
            { cacheKey: `${team.logoSrc}-playin`, shadow: 0 },
          );
        }
      }
    }
  };

  await paintCol((width - colW * 2 - gap) / 2, "EAST", input.east);
  await paintCol((width - colW * 2 - gap) / 2 + colW + gap, "WEST", input.west);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 72 * s;
      const inset = 36 * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
