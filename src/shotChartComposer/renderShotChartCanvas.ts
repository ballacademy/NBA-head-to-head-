import {
  paintCellFrame,
  paintPurpleBaGlow,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerNameLines,
  readComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import {
  paintHalfCourt,
  shotChartBoardRects,
  shotToPx,
} from "./shotChartLayout";
import {
  formatZoneSplit,
  shotLine,
  shotZoneSplits,
  splitShotChartTitle,
  visibleShots,
  type ShotChartDraft,
} from "./shotChartState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export type ShotChartRenderInput = ShotChartDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  story?: boolean;
};

export const renderShotChartCanvas = async (
  input: ShotChartRenderInput,
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
    context.fillText(input.brand.toUpperCase(), width / 2, 30 * s);
  }
  const lines = splitShotChartTitle(input.title);
  context.font = `900 ${40 * s}px ${POSTER_FONT}`;
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, (64 + index * 40) * s);
  });
  const nameLines = composerNameLines(
    input.firstName,
    input.lastName,
    readComposerNameStyle(),
  );
  if (nameLines.given) {
    context.font = `900 ${13 * s}px ${POSTER_FONT}`;
    context.fillText(nameLines.given.toUpperCase(), width / 2, 132 * s);
  }
  context.font = `900 ${36 * s}px ${POSTER_FONT}`;
  context.fillText(
    (nameLines.family || input.lastName || "PLAYER").toUpperCase(),
    width / 2,
    168 * s,
  );
  context.fillStyle = "#facc15";
  context.font = `900 ${14 * s}px ${POSTER_FONT}`;
  context.fillText(
    `${(input.gameLabel || "LAST GAME").toUpperCase()} · ${shotLine(input.makes, input.attempts)}`,
    width / 2,
    200 * s,
  );

  const rects = shotChartBoardRects(boardH);
  const court = {
    x: rects.court.x * s,
    y: rects.court.y * s,
    w: rects.court.w * s,
    h: rects.court.h * s,
  };
  paintHalfCourt(context, court);
  const shots = visibleShots(input.shots, input.showMakes, input.showMisses);
  shots.forEach((shot) => {
    const point = shotToPx(shot, court);
    context.beginPath();
    context.arc(point.x, point.y, (shot.made ? 9 : 8) * s, 0, Math.PI * 2);
    if (shot.made) {
      context.fillStyle = "#facc15";
      context.fill();
      context.strokeStyle = "#111111";
      context.lineWidth = 1.4 * s;
      context.stroke();
    } else {
      context.strokeStyle = "#fb7185";
      context.lineWidth = 2.8 * s;
      context.stroke();
    }
  });

  if (input.shots.length === 0) {
    context.fillStyle = "rgba(250, 250, 250, 0.78)";
    context.font = `900 ${22 * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.fillText(
      "NO SHOT LOCATION DATA",
      court.x + court.w / 2,
      court.y + court.h / 2,
    );
  } else {
    const zones = shotZoneSplits(shots);
    const cellW = (rects.zones.w * s) / 3;
    const cellH = (rects.zones.h * s) / 2;
    zones.forEach((zone, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = rects.zones.x * s + col * cellW;
      const y = rects.zones.y * s + row * cellH + cellH / 2;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillStyle = "rgba(255,255,255,0.78)";
      context.font = `900 ${12 * s}px ${POSTER_FONT}`;
      context.fillText(zone.label, x, y);
      context.fillStyle = "#facc15";
      context.textAlign = "right";
      context.font = `900 ${15 * s}px ${POSTER_FONT}`;
      context.fillText(
        formatZoneSplit(zone.makes, zone.attempts),
        x + cellW - 8 * s,
        y,
      );
    });
  }

  context.textAlign = "center";
  context.font = `900 ${13 * s}px ${POSTER_FONT}`;
  context.fillStyle = "#facc15";
  context.fillText("MAKE", width / 2 - 70 * s, rects.legendY * s);
  context.fillStyle = "#fb7185";
  context.fillText("MISS", width / 2 + 70 * s, rects.legendY * s);

  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 56 * s;
      const inset = 22 * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }
  return canvas;
};
