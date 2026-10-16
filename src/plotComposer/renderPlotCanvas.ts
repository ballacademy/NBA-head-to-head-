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
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeamGlowColor } from "../lib/teamColors";
import type { EveryTeamStatMetric } from "../everyTeamComposer/historicalRosters";
import {
  axisFromValues,
  formatPlotTick,
  PLOT_AXIS_SIZE,
  PLOT_AXIS_TITLE,
  PLOT_BA_INSET,
  PLOT_BA_SIZE,
  PLOT_BRAND_SIZE,
  PLOT_BRAND_Y,
  PLOT_KICKER_SIZE,
  PLOT_LABEL_SIZE,
  PLOT_TITLE_SIZE,
  PLOT_TITLE_Y,
  placePlotPoints,
  plotRectFor,
  shouldDrawHeadshot,
} from "./plotLayout";
import {
  plotKicker,
  plotMetricLabel,
  splitPlotTitle,
  type PlotPoint,
  type PlotSubject,
} from "./plotState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export interface PlotRenderInput {
  brand: string;
  title: string;
  subject: PlotSubject;
  xMetric: EveryTeamStatMetric;
  yMetric: EveryTeamStatMetric;
  points: PlotPoint[];
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
  showNames?: boolean;
  story?: boolean;
}

const strokeFill = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  stroke: number,
) => {
  context.lineJoin = "round";
  context.strokeStyle = "#000";
  context.lineWidth = stroke;
  context.strokeText(text, x, y);
  context.fillStyle = "#fff";
  context.fillText(text, x, y);
};

export const renderPlotCanvas = async (
  input: PlotRenderInput,
  scale = 2,
) => {
  const boardH = input.story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
  const width = GRAPHIC_WIDTH * scale;
  const height = boardH * scale;
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

  const plot = plotRectFor(boardH);
  const xAxis = axisFromValues(
    input.points.map((point) => point.x),
    input.xMetric,
  );
  const yAxis = axisFromValues(
    input.points.map((point) => point.y),
    input.yMetric,
  );
  const placed = placePlotPoints(
    input.points.map((point) => ({
      id: point.id,
      x: point.x,
      y: point.y,
      label: point.shortLabel || point.label,
      kind: point.kind,
    })),
    xAxis,
    yAxis,
    boardH,
    input.showNames !== false,
  );
  const xLabel = plotMetricLabel(input.xMetric);
  const yLabel = plotMetricLabel(input.yMetric);

  context.font = `900 ${PLOT_BRAND_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.letterSpacing = `${Math.round(PLOT_BRAND_SIZE * 0.18 * s)}px`;
  if (input.showBa === false) {
    context.fillStyle = "#fff";
    context.fillText(
      (input.brand || "BALLACADEMY").toUpperCase(),
      width / 2,
      (PLOT_BRAND_Y + 12) * s,
    );
  }
  context.letterSpacing = "0px";

  const lines = splitPlotTitle(input.title);
  context.font = `900 ${PLOT_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  lines.forEach((line, index) => {
    const y =
      (PLOT_TITLE_Y + 22 + index * (PLOT_TITLE_SIZE * 0.95)) * s;
    strokeFill(context, line, width / 2, y, 2.8 * s);
  });

  context.font = `900 ${PLOT_KICKER_SIZE * s}px ${POSTER_FONT}`;
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.fillText(
    plotKicker(input.subject, input.points.length, input.points.length > 0),
    width / 2,
    134 * s,
  );

  const left = plot.x * s;
  const top = plot.y * s;
  const pw = plot.w * s;
  const ph = plot.h * s;

  context.save();
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 1 * s;
  xAxis.ticks.forEach((tick) => {
    const x =
      left + ((tick - xAxis.min) / (xAxis.max - xAxis.min || 1)) * pw;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, top + ph);
    context.stroke();
  });
  yAxis.ticks.forEach((tick) => {
    const y =
      top + (1 - (tick - yAxis.min) / (yAxis.max - yAxis.min || 1)) * ph;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + pw, y);
    context.stroke();
  });
  context.strokeStyle = "rgba(255,255,255,0.55)";
  context.lineWidth = 1.6 * s;
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, top + ph);
  context.lineTo(left + pw, top + ph);
  context.stroke();
  context.restore();

  context.font = `900 ${PLOT_AXIS_SIZE * s}px ${POSTER_FONT}`;
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.textBaseline = "middle";
  xAxis.ticks.forEach((tick) => {
    const x =
      left + ((tick - xAxis.min) / (xAxis.max - xAxis.min || 1)) * pw;
    context.textAlign = "center";
    context.fillText(formatPlotTick(tick, input.xMetric), x, top + ph + 16 * s);
  });
  yAxis.ticks.forEach((tick) => {
    const y =
      top + (1 - (tick - yAxis.min) / (yAxis.max - yAxis.min || 1)) * ph;
    context.textAlign = "end";
    context.fillText(formatPlotTick(tick, input.yMetric), left - 10 * s, y);
  });

  context.save();
  context.font = `900 ${PLOT_AXIS_TITLE * s}px ${POSTER_FONT}`;
  context.fillStyle = "rgba(255,255,255,0.82)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(xLabel, left + pw / 2, top + ph + 48 * s);
  context.translate(left - 36 * s, top + ph / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(yLabel, 0, 0);
  context.restore();

  if (!input.points.length) {
    context.font = `900 ${22 * s}px ${POSTER_FONT}`;
    context.fillStyle = "rgba(255,255,255,0.38)";
    context.textAlign = "center";
    context.fillText("EMPTY — POPULATE TO PLOT", left + pw / 2, top + ph / 2);
  }

  const faces = shouldDrawHeadshot(
    input.subject === "teams" ? "team" : "player",
    input.points.length,
  );
  const photos = await Promise.all(
    input.points.map((point) =>
      point.photoSrc && (point.kind === "team" || faces)
        ? loadImage(point.photoSrc)
        : Promise.resolve(null),
    ),
  );

  for (let index = 0; index < placed.length; index += 1) {
    const mark = placed[index]!;
    const point = input.points.find((row) => row.id === mark.id);
    if (!point) {
      continue;
    }
    const photo = photos[index];
    const size = mark.mark * s;
    const cx = mark.px * s;
    const cy = mark.py * s;
    if (point.kind === "team" && photo) {
      drawCenteredLogo(context, photo, cx - size / 2, cy - size / 2, size, size, {
        cacheKey: `${point.photoSrc}-plot`,
        fitX: 0.92,
        fitY: 0.92,
        shadow: 4 * s,
      });
    } else if (faces && photo) {
      context.save();
      context.beginPath();
      context.arc(cx, cy, size / 2, 0, Math.PI * 2);
      context.closePath();
      context.clip();
      const ratio = photo.naturalWidth / photo.naturalHeight;
      const dw = ratio >= 1 ? size * ratio : size;
      const dh = ratio >= 1 ? size : size / ratio;
      context.drawImage(photo, cx - dw / 2, cy - dh / 2, dw, dh);
      context.restore();
      context.beginPath();
      context.arc(cx, cy, size / 2, 0, Math.PI * 2);
      context.strokeStyle = "rgba(255,255,255,0.85)";
      context.lineWidth = 1.6 * s;
      context.stroke();
    } else {
      context.beginPath();
      context.arc(cx, cy, (mark.mark / 2) * s, 0, Math.PI * 2);
      context.fillStyle = getTeamGlowColor(point.teamId);
      context.fill();
      context.lineWidth = 1.4 * s;
      context.strokeStyle = "rgba(0,0,0,0.55)";
      context.stroke();
    }
  }

  context.font = `900 ${PLOT_LABEL_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "top";
  placed.forEach((mark) => {
    if (!mark.showLabel) {
      return;
    }
    strokeFill(context, mark.label, mark.lx * s, mark.ly * s, 2.2 * s);
  });

  paintCellFrame(context, 0, 0, width, height, input.look, s);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = PLOT_BA_SIZE * s;
      const inset = PLOT_BA_INSET * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
