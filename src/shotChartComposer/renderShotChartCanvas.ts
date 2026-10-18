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
  courtPoint,
  shotLine,
  splitShotChartTitle,
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

const paintCourt = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  context.save();
  context.translate(x, y);
  const sx = w / 500;
  const sy = h / 470;
  context.scale(sx, sy);
  context.strokeStyle = "#fff";
  context.lineWidth = 4;
  context.strokeRect(4, 4, 492, 462);
  context.beginPath();
  context.moveTo(4, 430);
  context.lineTo(496, 430);
  context.stroke();
  context.beginPath();
  context.arc(250, 430, 75, 0, Math.PI * 2);
  context.stroke();
  context.strokeRect(175, 280, 150, 150);
  context.beginPath();
  context.arc(250, 280, 60, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(250, 418, 12, 0, Math.PI * 2);
  context.strokeStyle = "#facc15";
  context.stroke();
  context.strokeStyle = "#fff";
  context.beginPath();
  context.moveTo(33, 430);
  context.lineTo(33, 250);
  context.arc(250, 250, 217, Math.PI, 0);
  context.lineTo(467, 430);
  context.stroke();
  context.restore();
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
    context.fillText(input.brand.toUpperCase(), width / 2, 34 * s);
  }
  const lines = splitShotChartTitle(input.title);
  context.font = `900 ${44 * s}px ${POSTER_FONT}`;
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, (86 + index * 46) * s);
  });
  const nameLines = composerNameLines(
    input.firstName,
    input.lastName,
    readComposerNameStyle(),
  );
  if (nameLines.given) {
    context.font = `900 ${14 * s}px ${POSTER_FONT}`;
    context.fillText(nameLines.given.toUpperCase(), width / 2, 168 * s);
  }
  context.font = `900 ${42 * s}px ${POSTER_FONT}`;
  context.fillText(
    (nameLines.family || input.lastName || "PLAYER").toUpperCase(),
    width / 2,
    206 * s,
  );
  context.fillStyle = "#facc15";
  context.font = `900 ${14 * s}px ${POSTER_FONT}`;
  context.fillText(
    `${(input.gameLabel || "LAST GAME").toUpperCase()} · ${shotLine(input.makes, input.attempts)}`,
    width / 2,
    240 * s,
  );

  const courtW = 760 * s;
  const courtH = (boardH - 300) * s;
  const courtX = (width - courtW) / 2;
  const courtY = 260 * s;
  paintCourt(context, courtX, courtY, courtW, courtH);
  input.shots.forEach((shot) => {
    const point = courtPoint(shot, courtW, courtH);
    context.beginPath();
    context.arc(courtX + point.x, courtY + point.y, (shot.made ? 7 : 6) * s, 0, Math.PI * 2);
    if (shot.made) {
      context.fillStyle = "#facc15";
      context.fill();
    } else {
      context.strokeStyle = "#fb7185";
      context.lineWidth = 2.4 * s;
      context.stroke();
    }
  });

  context.font = `900 ${12 * s}px ${POSTER_FONT}`;
  context.fillStyle = "#facc15";
  context.fillText("MAKE", width / 2 - 60 * s, height - 28 * s);
  context.fillStyle = "#fb7185";
  context.fillText("MISS", width / 2 + 60 * s, height - 28 * s);

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
