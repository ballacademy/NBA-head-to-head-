import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  PI_BA_INSET,
  PI_BA_SIZE,
  PI_BYE_LABEL,
  PI_CONF_SIZE,
  PI_LOGO_FIT,
  PI_MATCH_LABEL_SIZE,
  PI_SEED_SIZE,
  PI_TITLE_SIZE,
  PI_TITLE_Y,
  playInBoardCols,
  type PlayInSlotRect,
} from "./playInLayout";
import { type PlayInDraft } from "./playInState";

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

const paintSlot = async (
  context: CanvasRenderingContext2D,
  slot: PlayInSlotRect,
  teamId: string | null | undefined,
  look: ComposerLook | undefined,
  purpleFlair: boolean | undefined,
  s: number,
  bye = false,
) => {
  const x = slot.x * s;
  const y = slot.y * s;
  const w = slot.w * s;
  const h = slot.h * s;
  context.fillStyle = "rgba(10,10,12,0.42)";
  context.fillRect(x, y, w, h);
  paintCellFrame(context, x, y, w, h, look, s);
  if (purpleFlair) {
    paintPurplePlateEdge(context, x, y, w, h, s);
  }
  context.font = `900 ${PI_SEED_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillStyle = "#fff";
  context.fillText(String(slot.seed), x + 10 * s, y + 8 * s);
  if (bye) {
    context.font = `900 ${16 * s}px ${POSTER_FONT}`;
    context.textAlign = "right";
    context.fillStyle = "rgba(255,255,255,0.7)";
    context.fillText(PI_BYE_LABEL, x + w - 12 * s, y + 12 * s);
  }
  const team = getTeam(teamId);
  if (!team) {
    return;
  }
  const logo = await loadImage(team.logoSrc);
  if (!logo) {
    return;
  }
  drawCenteredLogo(context, logo, x, y, w, h, {
    cacheKey: `${team.logoSrc}-playin`,
    fitX: PI_LOGO_FIT,
    fitY: PI_LOGO_FIT,
  });
};

const paintBracket = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  side: "east" | "west",
  s: number,
) => {
  const stroke = 3.5 * s;
  context.save();
  context.strokeStyle = "rgba(255,255,255,0.88)";
  context.fillStyle = "rgba(255,255,255,0.88)";
  context.lineWidth = stroke;
  context.beginPath();
  if (side === "east") {
    context.moveTo(x, y);
    context.lineTo(x + w - stroke, y);
    context.arcTo(x + w, y, x + w, y + stroke, 10 * s);
    context.lineTo(x + w, y + h - stroke);
    context.arcTo(x + w, y + h, x + w - stroke, y + h, 10 * s);
    context.lineTo(x, y + h);
    context.stroke();
    context.fillRect(x + w, y + h / 2 - stroke / 2, 14 * s, stroke);
  } else {
    context.moveTo(x + w, y);
    context.lineTo(x + stroke, y);
    context.arcTo(x, y, x, y + stroke, 10 * s);
    context.lineTo(x, y + h - stroke);
    context.arcTo(x, y + h, x + stroke, y + h, 10 * s);
    context.lineTo(x + w, y + h);
    context.stroke();
    context.fillRect(x - 14 * s, y + h / 2 - stroke / 2, 14 * s, stroke);
  }
  context.restore();
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

  context.font = `900 ${PI_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "#000";
  context.lineWidth = 3 * s;
  const title = input.title.trim().toUpperCase() || "NBA PLAY-IN";
  context.strokeText(title, width / 2, PI_TITLE_Y * s);
  context.fillStyle = "#fff";
  context.fillText(title, width / 2, PI_TITLE_Y * s);

  const cols = playInBoardCols(input.size);
  for (const col of cols) {
    const ids = col.conference === "east" ? input.east : input.west;
    context.font = `900 ${PI_CONF_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.fillText(col.label, (col.x + col.w / 2) * s, (col.y + 14) * s);
    if (col.bye) {
      await paintSlot(
        context,
        col.bye,
        ids[col.bye.index],
        input.look,
        input.purpleFlair,
        s,
        true,
      );
    }
    for (const match of col.matches) {
      context.font = `900 ${PI_MATCH_LABEL_SIZE * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "rgba(255,255,255,0.92)";
      context.fillText(match.label.toUpperCase(), match.labelX * s, match.labelY * s);
      await paintSlot(
        context,
        match.slots[0],
        ids[match.slots[0].index],
        input.look,
        input.purpleFlair,
        s,
      );
      await paintSlot(
        context,
        match.slots[1],
        ids[match.slots[1].index],
        input.look,
        input.purpleFlair,
        s,
      );
      paintBracket(
        context,
        match.line.x * s,
        match.line.y * s,
        match.line.w * s,
        match.line.h * s,
        match.line.side,
        s,
      );
    }
  }

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = PI_BA_SIZE * s;
      const inset = PI_BA_INSET * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
