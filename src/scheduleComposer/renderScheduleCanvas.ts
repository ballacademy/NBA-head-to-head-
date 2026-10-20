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
  scheduleBackToBackEventIds,
  scheduleFillLayout,
  scheduleGroups,
  splitScheduleTitle,
  type ScheduleDraft,
} from "./scheduleState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export type ScheduleRenderInput = ScheduleDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  story?: boolean;
};

export const renderScheduleCanvas = async (
  input: ScheduleRenderInput,
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
  const lines = splitScheduleTitle(input.title);
  context.font = `900 ${52 * s}px ${POSTER_FONT}`;
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, (96 + index * 54) * s);
  });
  context.font = `900 ${16 * s}px ${POSTER_FONT}`;
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.fillText((input.weekLine || "").toUpperCase(), width / 2, 210 * s);

  const groups = scheduleGroups(input.games);
  const needed = new Set<string>();
  groups.forEach((group) => {
    group.games.forEach((game) => {
      needed.add(game.awayId);
      needed.add(game.homeId);
    });
  });
  const logos = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    [...needed].map(async (id) => {
      const team = getTeam(id);
      logos.set(id, team ? await loadImage(team.logoSrc) : null);
    }),
  );

  const fill = scheduleFillLayout(groups, boardH);
  const listLeft = 32 * s;
  const listRight = width - 32 * s;
  const gutter = 20 * s;
  const colW = (listRight - listLeft - gutter) / 2;
  const logo = fill.logo * s;
  const b2b = scheduleBackToBackEventIds(input.games);
  groups.forEach((group, dayIndex) => {
    const dayTop = (fill.listTop + dayIndex * (fill.dayH + fill.dayGap)) * s;
    context.textAlign = "left";
    context.fillStyle = "#facc15";
    context.font = `900 ${16 * s}px ${POSTER_FONT}`;
    context.fillText(group.label, listLeft, dayTop + 12 * s);
    const rows = Math.max(1, Math.ceil(group.games.length / 2));
    const rowH = (fill.gamesH * s) / rows;
    group.games.forEach((game, gameIndex) => {
      const col = gameIndex % 2;
      const row = Math.floor(gameIndex / 2);
      const x0 = listLeft + col * (colW + gutter);
      const y = dayTop + fill.labelH * s + row * rowH + rowH / 2;
      const away = logos.get(game.awayId);
      const home = logos.get(game.homeId);
      if (away) {
        drawCenteredLogo(context, away, x0, y - logo / 2, logo, logo, {
          cacheKey: `${game.awayId}-sch`,
          shadow: 0,
        });
      }
      if (home) {
        drawCenteredLogo(
          context,
          home,
          x0 + colW * 0.44,
          y - logo / 2,
          logo,
          logo,
          {
            cacheKey: `${game.homeId}-sch`,
            shadow: 0,
          },
        );
      }
      context.fillStyle = "#93c5fd";
      context.font = `900 ${fill.type * s}px ${POSTER_FONT}`;
      context.textAlign = "left";
      context.fillText(game.awayId, x0 + logo + 8 * s, y);
      context.textAlign = "center";
      context.fillStyle = "rgba(255,255,255,0.55)";
      context.fillText("@", x0 + colW * 0.4, y);
      context.textAlign = "left";
      context.fillStyle = "#fde68a";
      context.fillText(game.homeId, x0 + colW * 0.44 + logo + 8 * s, y);
      context.textAlign = "right";
      context.font = `900 ${fill.time * s}px ${POSTER_FONT}`;
      context.fillStyle = "#fff";
      const b2bMark = b2b.has(game.eventId || `${game.date}-${game.awayId}`)
        ? "  B2B"
        : "";
      context.fillText(`${game.timeLabel}${b2bMark}`, x0 + colW, y);
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
