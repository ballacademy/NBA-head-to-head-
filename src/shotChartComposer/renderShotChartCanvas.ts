import {
  clipToInnerFrame,
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { readComposerNameStyle } from "../instagramComposer/composerNameStyle";
import {
  FIELD_TEXTURE_SRC,
  drawBannerInterior,
  paintHeaderMetalField,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  SHOT_BRAND_H,
  SHOT_HEADER_H,
  SHOT_HEADER_PAD,
  SHOT_MAKE_R,
  SHOT_MISS_R,
  SHOT_NOTCH_H,
  SHOT_NOTCH_LOGO,
  SHOT_NOTCH_OVERLAP,
  SHOT_PLATE_X,
  SHOT_PLATE_Y,
  SHOT_TITLE_PAD,
  SHOT_TITLE_PLATE_H,
  SHOT_TITLE_SIZE,
  SHOT_TITLE_TRACK,
  paintHalfCourt,
  shotChartBoardRects,
  shotToPx,
} from "./shotChartLayout";
import {
  shotChartNotchMeta,
  shotChartPlayerLabel,
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

const withShadow = (
  context: CanvasRenderingContext2D,
  scale: number,
  paint: () => void,
) => {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.82)";
  context.shadowOffsetX = Math.round(1.2 * scale);
  context.shadowOffsetY = Math.round(1.5 * scale);
  context.shadowBlur = 0;
  paint();
  context.restore();
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
  context.strokeStyle = stroke;
  context.lineWidth = strokeWidth;
  context.strokeText(text, x, y);
  context.fillStyle = fill;
  context.fillText(text, x, y);
};

const setLetterSpacing = (
  context: CanvasRenderingContext2D,
  value: number,
) => {
  const extra = context as CanvasRenderingContext2D & { letterSpacing?: string };
  extra.letterSpacing = `${value}px`;
};

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
  await document.fonts?.load(`italic 900 ${SHOT_TITLE_SIZE * s}px ${POSTER_FONT}`);
  await document.fonts?.load(`900 ${22 * s}px ${POSTER_FONT}`);
  paintHeaderMetalField(
    context,
    await loadImage(FIELD_TEXTURE_SRC),
    width,
    height,
    SHOT_HEADER_H * s,
    s,
  );
  paintCellFrame(context, 0, 0, width, height, input.look, s);

  context.textAlign = "center";
  context.textBaseline = "middle";
  if (!input.showBa) {
    context.fillStyle = "#fff";
    context.font = `900 ${22 * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.18 * 22 * s);
    withShadow(context, s, () => {
      context.fillText(
        input.brand.toUpperCase(),
        width / 2,
        (SHOT_HEADER_PAD + SHOT_BRAND_H / 2) * s,
      );
    });
    setLetterSpacing(context, 0);
  }

  const lines = splitShotChartTitle(input.title);
  const plate = {
    x: SHOT_PLATE_X * s,
    y: SHOT_PLATE_Y * s,
    w: width - SHOT_PLATE_X * 2 * s,
    h: SHOT_TITLE_PLATE_H * s,
  };
  drawBannerInterior(context, plate.x, plate.y, plate.w, plate.h, s, () => {
    context.beginPath();
    context.rect(plate.x, plate.y, plate.w, plate.h);
  });
  paintCellFrame(context, plate.x, plate.y, plate.w, plate.h, input.look, s);
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, plate.x, plate.y, plate.w, plate.h, s);
  }
  context.save();
  clipToInnerFrame(context, plate.x, plate.y, plate.w, plate.h, s, input.look);
  const titlePad = SHOT_TITLE_PAD * s;
  context.beginPath();
  context.rect(
    plate.x + titlePad,
    plate.y + titlePad,
    plate.w - titlePad * 2,
    plate.h - titlePad * 2,
  );
  context.clip();
  context.font = `italic 900 ${SHOT_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, SHOT_TITLE_TRACK * SHOT_TITLE_SIZE * s);
  withShadow(context, s, () => {
    strokeFillText(
      context,
      lines[0] ?? "",
      width / 2,
      plate.y + plate.h / 2,
      "#fff",
      "#000",
      3.2 * s,
    );
  });
  setLetterSpacing(context, 0);
  context.restore();

  const nameStyle = readComposerNameStyle();
  const playerLabel = shotChartPlayerLabel(input, nameStyle).toUpperCase();
  const meta = shotChartNotchMeta(input).toUpperCase();
  context.font = `900 ${16 * s}px ${POSTER_FONT}`;
  setLetterSpacing(context, 0.06 * 16 * s);
  const nameW = context.measureText(playerLabel).width;
  context.font = `900 ${12 * s}px ${POSTER_FONT}`;
  setLetterSpacing(context, 0.08 * 12 * s);
  const metaW = context.measureText(meta).width;
  setLetterSpacing(context, 0);
  const logoOn = Boolean(input.teamId && getTeam(input.teamId));
  const logoSize = SHOT_NOTCH_LOGO * s;
  const nameRowW = nameW + (logoOn ? logoSize + 8 * s : 0);
  const notchW = Math.min(
    width * 0.78,
    Math.max(280 * s, Math.max(nameRowW, metaW) + 144 * s),
  );
  const notchH = SHOT_NOTCH_H * s;
  const notchX = (width - notchW) / 2;
  const notchY = plate.y + plate.h - SHOT_NOTCH_OVERLAP * s;
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(notchX + 8 * s, notchY);
  context.lineTo(notchX + notchW - 8 * s, notchY);
  context.lineTo(notchX + notchW, notchY + notchH);
  context.lineTo(notchX, notchY + notchH);
  context.closePath();
  context.fill();
  if (input.purpleFlair) {
    context.strokeStyle = "#b026ff";
    context.lineWidth = 2 * s;
    context.stroke();
  }

  const nameY = notchY + 20 * s;
  const metaY = notchY + 38 * s;
  const team = getTeam(input.teamId);
  const logo = team ? await loadImage(team.logoSrc) : null;
  const nameStart = width / 2 - nameRowW / 2;
  if (logo) {
    drawCenteredLogo(context, logo, nameStart, nameY - logoSize / 2, logoSize, logoSize, {
      shadow: 1 * s,
      cacheKey: team?.logoSrc,
    });
  }
  context.fillStyle = "#111";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.font = `900 ${16 * s}px ${POSTER_FONT}`;
  setLetterSpacing(context, 0.06 * 16 * s);
  context.fillText(
    playerLabel,
    nameStart + (logo ? logoSize + 8 * s : 0),
    nameY,
  );
  context.textAlign = "center";
  context.font = `900 ${12 * s}px ${POSTER_FONT}`;
  setLetterSpacing(context, 0.08 * 12 * s);
  context.fillStyle = "#222";
  context.fillText(meta, width / 2, metaY);
  setLetterSpacing(context, 0);

  const showZones = input.showZones !== false;
  const showLegend = input.showLegend !== false;
  const rects = shotChartBoardRects(boardH, { showZones, showLegend });
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
    context.arc(
      point.x,
      point.y,
      (shot.made ? SHOT_MAKE_R : SHOT_MISS_R) * s,
      0,
      Math.PI * 2,
    );
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
  } else if (showZones) {
    const zones = shotZoneSplits(shots);
    const cellW = (rects.zones.w * s) / 3;
    const cellH = (rects.zones.h * s) / 2;
    zones.forEach((zone, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const cx = rects.zones.x * s + col * cellW + cellW / 2;
      const cy = rects.zones.y * s + row * cellH + cellH / 2;
      const split = `${zone.makes}–${zone.attempts}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `900 ${17 * s}px ${POSTER_FONT}`;
      const gap = 8 * s;
      const splitW = context.measureText(split).width;
      const labelW = context.measureText(zone.label).width;
      const total = labelW + gap + splitW;
      context.fillStyle = "#fff";
      context.textAlign = "left";
      context.fillText(zone.label, cx - total / 2, cy);
      context.fillStyle = "#facc15";
      context.fillText(split, cx - total / 2 + labelW + gap, cy);
    });
  }

  if (showLegend) {
    context.textAlign = "center";
    context.font = `900 ${13 * s}px ${POSTER_FONT}`;
    context.fillStyle = "#facc15";
    context.fillText("MAKE", width / 2 - 70 * s, rects.legendY * s);
    context.fillStyle = "#fb7185";
    context.fillText("MISS", width / 2 + 70 * s, rects.legendY * s);
  }

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
