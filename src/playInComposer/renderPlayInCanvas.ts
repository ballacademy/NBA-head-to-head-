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
import {
  formatStandingRecord,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  PI_ABBR_SIZE,
  PI_BA_INSET,
  PI_BA_SIZE,
  PI_BYE_LABEL,
  PI_CONF_SIZE,
  PI_KICKER,
  PI_KICKER_SIZE,
  PI_KICKER_Y,
  PI_LEGEND,
  PI_LEGEND_SIZE,
  PI_LEGEND_Y,
  PI_LOGO_FIT,
  PI_SEED_SIZE,
  PI_TITLE_SIZE,
  PI_TITLE_Y,
  playInBoardCols,
  type PlayInBar,
  type PlayInSlotRect,
} from "./playInLayout";
import {
  nineTenWinnerId,
  slotScore,
  type PlayInDraft,
} from "./playInState";

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

const paintBar = (
  context: CanvasRenderingContext2D,
  bar: PlayInBar,
  s: number,
) => {
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.fillRect(bar.x * s, bar.y * s, bar.w * s, bar.h * s);
};

const paintSlot = async (
  context: CanvasRenderingContext2D,
  slot: PlayInSlotRect,
  teamId: string | null | undefined,
  look: ComposerLook | undefined,
  purpleFlair: boolean | undefined,
  s: number,
  bye = false,
  record: string | null = null,
  score = "",
) => {
  const x = slot.x * s;
  const y = slot.y * s;
  const w = slot.w * s;
  const h = slot.h * s;
  context.fillStyle = "rgba(8,8,10,0.55)";
  context.fillRect(x, y, w, h);
  paintCellFrame(context, x, y, w, h, look, s);
  if (purpleFlair) {
    paintPurplePlateEdge(context, x, y, w, h, s);
  }
  const team = getTeam(teamId);
  if (team) {
    const logo = await loadImage(team.logoSrc);
    if (logo) {
      drawCenteredLogo(context, logo, x, y, w, h, {
        cacheKey: `${team.logoSrc}-playin`,
        fitX: PI_LOGO_FIT,
        fitY: PI_LOGO_FIT,
      });
    }
    context.font = `900 ${PI_ABBR_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillStyle = "#fff";
    context.fillText(
      team.id,
      x + w / 2,
      y + h - (record ? 28 : 10) * s,
    );
    if (record) {
      context.font = `900 ${14 * s}px ${POSTER_FONT}`;
      context.fillText(record, x + w / 2, y + h - 8 * s);
    }
  }
  const bx = slot.badge.x * s;
  const by = slot.badge.y * s;
  const bw = slot.badge.w * s;
  const bh = slot.badge.h * s;
  const badgeFill = look === "black" ? "#0a0a0a" : "#fff";
  const badgeInk = look === "black" ? "#fff" : "#111";
  context.fillStyle = badgeFill;
  context.fillRect(bx, by, bw, bh);
  context.font = `900 ${PI_SEED_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = badgeInk;
  context.fillText(String(slot.seed), bx + bw / 2, by + bh / 2 + 1 * s);
  if (bye) {
    context.font = `900 ${16 * s}px ${POSTER_FONT}`;
    context.textAlign = "right";
    context.textBaseline = "top";
    context.fillStyle = "rgba(255,255,255,0.78)";
    context.fillText(PI_BYE_LABEL, x + w - 14 * s, y + 16 * s);
  }
  if (score) {
    context.fillStyle = "rgba(0,0,0,0.72)";
    context.fillRect(x + w - 62 * s, y + 12 * s, 50 * s, 32 * s);
    paintCellFrame(context, x + w - 62 * s, y + 12 * s, 50 * s, 32 * s, look, s);
    context.font = `900 ${22 * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.fillText(score, x + w - 37 * s, y + 28 * s);
  }
};

const paintPlate = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  look: ComposerLook | undefined,
  purpleFlair: boolean | undefined,
  eight: boolean,
  s: number,
) => {
  context.fillStyle = eight
    ? purpleFlair
      ? "rgba(176,38,255,0.16)"
      : "rgba(255,255,255,0.1)"
    : "rgba(10,10,12,0.78)";
  context.fillRect(x, y, w, h);
  paintCellFrame(context, x, y, w, h, look, s);
  if (purpleFlair) {
    paintPurplePlateEdge(context, x, y, w, h, s);
  }
  context.font = `900 ${(eight ? 15 : 18) * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  context.fillText(label, x + w / 2, y + h / 2, w - 8 * s);
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

  const title = input.title.trim().toUpperCase() || "PLAY-IN TOURNAMENT";
  context.font = `900 ${PI_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "#000";
  context.lineWidth = 3.4 * s;
  context.strokeText(title, width / 2, PI_TITLE_Y * s);
  context.fillStyle = "#fff";
  context.fillText(title, width / 2, PI_TITLE_Y * s);

  context.font = `900 ${PI_KICKER_SIZE * s}px ${POSTER_FONT}`;
  context.fillStyle = "rgba(255,255,255,0.82)";
  context.fillText(PI_KICKER, width / 2, PI_KICKER_Y * s);

  const cols = playInBoardCols(input.size);
  for (const col of cols) {
    const ids = col.conference === "east" ? input.east : input.west;
    context.font = `900 ${PI_CONF_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = col.conference === "east" ? "#7eb6ff" : "#ff8a7a";
    context.fillText(col.label, (col.x + col.w / 2) * s, (col.y + 16) * s);
    const scores = col.conference === "east" ? input.eastScores : input.westScores;
    const recordFor = (teamId: string | null | undefined) =>
      input.showWl && teamId
        ? formatStandingRecord(input.records?.[teamId])
        : null;
    if (col.bye) {
      await paintSlot(
        context,
        col.bye,
        ids[col.bye.index],
        input.look,
        input.purpleFlair,
        s,
        true,
        recordFor(ids[col.bye.index]),
        slotScore(input.size, col.bye.seed, scores),
      );
    }
    for (const match of col.matches) {
      match.lines.forEach((bar) => paintBar(context, bar, s));
      await paintSlot(
        context,
        match.slots[0],
        ids[match.slots[0].index],
        input.look,
        input.purpleFlair,
        s,
        false,
        recordFor(ids[match.slots[0].index]),
        slotScore(input.size, match.slots[0].seed, scores),
      );
      await paintSlot(
        context,
        match.slots[1],
        ids[match.slots[1].index],
        input.look,
        input.purpleFlair,
        s,
        false,
        recordFor(ids[match.slots[1].index]),
        slotScore(input.size, match.slots[1].seed, scores),
      );
      paintPlate(
        context,
        match.winner.x * s,
        match.winner.y * s,
        match.winner.w * s,
        match.winner.h * s,
        match.winner.label,
        input.look,
        input.purpleFlair,
        false,
        s,
      );
    }
    col.eightLines.forEach((bar) => paintBar(context, bar, s));
    const winnerId = nineTenWinnerId(ids, input.size, scores);
    const winner = getTeam(winnerId);
    const eightX = col.eightSeed.x * s;
    const eightY = col.eightSeed.y * s;
    const eightW = col.eightSeed.w * s;
    const eightH = col.eightSeed.h * s;
    paintPlate(
      context,
      eightX,
      eightY,
      eightW,
      eightH,
      winner ? "" : col.eightSeed.label,
      input.look,
      input.purpleFlair,
      true,
      s,
    );
    if (winner) {
      const logo = await loadImage(winner.logoSrc);
      if (logo) {
        drawCenteredLogo(
          context,
          logo,
          eightX + 8 * s,
          eightY + 4 * s,
          eightW - 16 * s,
          eightH - 8 * s,
          {
            cacheKey: `${winner.logoSrc}-playin-eight`,
            fitX: 0.86,
            fitY: 0.86,
            shadow: 0,
          },
        );
      }
    }
  }

  context.font = `900 ${PI_LEGEND_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.fillText(PI_LEGEND, width / 2, PI_LEGEND_Y * s);

  paintCellFrame(context, 0, 0, width, height, input.look, s);

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
