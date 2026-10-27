import { COURT_FLOOR } from "../standingsComposer/headerTexture";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { COURT_FLOOR };

/** NBA half-court in feet. Hoop is 5.25 ft from the baseline. */
export const COURT_FT_W = 50;
export const COURT_FT_H = 47;
/** Visible slice: baseline through a little air past the 3-point line. */
export const COURT_VIEW_H_FT = 40;
export const HOOP_X_FT = 25;
export const HOOP_FROM_BASELINE_FT = 5.25;
export const RESTRICTED_R_FT = 4;
export const PAINT_W_FT = 16;
export const PAINT_D_FT = 19;
export const FT_CIRCLE_R_FT = 6;
export const FT_LINE_Y_FT = 19;
export const CORNER_3_X_FT = 3;
export const CORNER_3_Y_FT = 14;
export const THREE_R_FT = 23.75;

export const SHOT_HEADER_PAD = 8;
export const SHOT_BRAND_H = 32;
export const SHOT_PLATE_Y = SHOT_HEADER_PAD + SHOT_BRAND_H;
export const SHOT_PLATE_X = 48;
export const SHOT_TITLE_SIZE = 38;
export const SHOT_TITLE_LINE = 0.92;
export const SHOT_TITLE_PAD = 12;
export const SHOT_TITLE_TRACK = 0.02;
export const SHOT_TITLE_PLATE_H =
  8 +
  SHOT_TITLE_PAD * 2 +
  Math.ceil(SHOT_TITLE_SIZE * SHOT_TITLE_LINE) +
  6;
export const SHOT_NOTCH_H = 54;
export const SHOT_NOTCH_OVERLAP = 2;
export const SHOT_NOTCH_LOGO = 32;
export const SHOT_COURT_GAP = 16;
export const SHOT_MAKE_R = 11;
export const SHOT_MISS_R = 10;
export const SHOT_ZONES_H = 140;
export const SHOT_ZONES_GAP = 14;
export const SHOT_LEGEND_H = 32;
export const SHOT_BOTTOM = 16;

/** Metal covers BA + title plate + name notch. Court sits below a charcoal gap. */
export const SHOT_HEADER_H =
  SHOT_PLATE_Y + SHOT_TITLE_PLATE_H + SHOT_NOTCH_H - SHOT_NOTCH_OVERLAP;

export interface ShotChartRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShotChartBoardRects {
  court: ShotChartRect;
  zones: ShotChartRect;
  legendY: number;
}

export interface ShotChartBoardOpts {
  showZones?: boolean;
  showLegend?: boolean;
}

/** ESPN PBP: x is 0–50 ft from the left sideline, y is feet from the hoop. */
export const shotToPx = (
  shot: { x: number; y: number },
  court: ShotChartRect,
) => {
  const yFromBaseline = shot.y + HOOP_FROM_BASELINE_FT;
  const x = court.x + (shot.x / COURT_FT_W) * court.w;
  const y =
    court.y + court.h - (yFromBaseline / COURT_VIEW_H_FT) * court.h;
  return {
    x: Math.min(court.x + court.w - 2, Math.max(court.x + 2, x)),
    y: Math.min(court.y + court.h - 2, Math.max(court.y + 2, y)),
  };
};

export const shotChartBoardRects = (
  boardH = GRAPHIC_HEIGHT,
  opts: ShotChartBoardOpts = {},
): ShotChartBoardRects => {
  const showZones = opts.showZones !== false;
  const showLegend = opts.showLegend !== false;
  const legendH = showLegend ? SHOT_LEGEND_H : 0;
  const padX = 36;
  const availW = GRAPHIC_WIDTH - padX * 2;
  const courtTop = SHOT_HEADER_H + SHOT_COURT_GAP;
  const zonesGap = showZones ? SHOT_ZONES_GAP : 8;
  const legendBlock = showLegend ? 14 + legendH : SHOT_BOTTOM;
  const below =
    zonesGap + (showZones ? SHOT_ZONES_H : 0) + legendBlock;
  const availH = Math.max(240, boardH - courtTop - below);
  const aspect = COURT_FT_W / COURT_VIEW_H_FT;
  let courtW = availW;
  let courtH = courtW / aspect;
  if (courtH > availH) {
    courtH = availH;
    courtW = courtH * aspect;
  }
  const court: ShotChartRect = {
    x: (GRAPHIC_WIDTH - courtW) / 2,
    y: courtTop,
    w: courtW,
    h: courtH,
  };
  const zones: ShotChartRect = {
    x: court.x,
    y: court.y + court.h + zonesGap,
    w: court.w,
    h: showZones ? SHOT_ZONES_H : 0,
  };
  return {
    court,
    zones,
    legendY: showZones
      ? zones.y + zones.h + 16
      : court.y + court.h + 16,
  };
};

const scale = (court: ShotChartRect) => ({
  x: (ft: number) => court.x + (ft / COURT_FT_W) * court.w,
  y: (fromBaseline: number) =>
    court.y + court.h - (fromBaseline / COURT_VIEW_H_FT) * court.h,
  ftX: (ft: number) => (ft / COURT_FT_W) * court.w,
  ftY: (ft: number) => (ft / COURT_VIEW_H_FT) * court.h,
});

export const paintHalfCourt = (
  context: CanvasRenderingContext2D,
  court: ShotChartRect,
  line = "#f4f4f5",
) => {
  const s = scale(court);
  const hoopX = s.x(HOOP_X_FT);
  const hoopY = s.y(HOOP_FROM_BASELINE_FT);
  const paintL = s.x((COURT_FT_W - PAINT_W_FT) / 2);
  const paintR = s.x((COURT_FT_W + PAINT_W_FT) / 2);
  const baseline = s.y(0);
  const ftY = s.y(FT_LINE_Y_FT);
  const cornerY = s.y(CORNER_3_Y_FT);
  const leftCorner = s.x(CORNER_3_X_FT);
  const rightCorner = s.x(COURT_FT_W - CORNER_3_X_FT);
  const threeR = s.ftX(THREE_R_FT);
  const leftAngle = Math.atan2(cornerY - hoopY, leftCorner - hoopX);
  const rightAngle = Math.atan2(cornerY - hoopY, rightCorner - hoopX);

  context.save();
  context.fillStyle = COURT_FLOOR;
  context.fillRect(court.x, court.y, court.w, court.h);
  context.strokeStyle = line;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.lineWidth = Math.max(2, court.w / 180);
  context.strokeRect(court.x, court.y, court.w, court.h);

  context.beginPath();
  context.moveTo(paintL, baseline);
  context.lineTo(paintL, ftY);
  context.lineTo(paintR, ftY);
  context.lineTo(paintR, baseline);
  context.stroke();

  context.beginPath();
  context.arc(hoopX, hoopY, s.ftX(RESTRICTED_R_FT), Math.PI, 0, true);
  context.stroke();

  context.beginPath();
  context.arc(hoopX, ftY, s.ftX(FT_CIRCLE_R_FT), 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.arc(hoopX, hoopY, Math.max(3, court.w / 90), 0, Math.PI * 2);
  context.strokeStyle = "#facc15";
  context.stroke();
  context.strokeStyle = line;

  context.beginPath();
  context.moveTo(leftCorner, baseline);
  context.lineTo(leftCorner, cornerY);
  context.arc(hoopX, hoopY, threeR, leftAngle, rightAngle, true);
  context.lineTo(rightCorner, baseline);
  context.stroke();

  context.restore();
};

export const halfCourtSvgPaths = (w: number, h: number) => {
  const court = { x: 0, y: 0, w, h };
  const s = scale(court);
  const hoopX = s.x(HOOP_X_FT);
  const hoopY = s.y(HOOP_FROM_BASELINE_FT);
  const paintL = s.x((COURT_FT_W - PAINT_W_FT) / 2);
  const paintR = s.x((COURT_FT_W + PAINT_W_FT) / 2);
  const baseline = s.y(0);
  const ftY = s.y(FT_LINE_Y_FT);
  const cornerY = s.y(CORNER_3_Y_FT);
  const leftCorner = s.x(CORNER_3_X_FT);
  const rightCorner = s.x(COURT_FT_W - CORNER_3_X_FT);
  const threeR = s.ftX(THREE_R_FT);
  const restrictR = s.ftX(RESTRICTED_R_FT);
  const ftR = s.ftX(FT_CIRCLE_R_FT);
  return {
    w,
    h,
    hoopX,
    hoopY,
    hoopR: Math.max(3, w / 90),
    paint: `M ${paintL} ${baseline} L ${paintL} ${ftY} L ${paintR} ${ftY} L ${paintR} ${baseline}`,
    restricted: `M ${hoopX - restrictR} ${hoopY} A ${restrictR} ${restrictR} 0 0 1 ${hoopX + restrictR} ${hoopY}`,
    ftCircle: { cx: hoopX, cy: ftY, r: ftR },
    three: `M ${leftCorner} ${baseline} L ${leftCorner} ${cornerY} A ${threeR} ${threeR} 0 0 1 ${rightCorner} ${cornerY} L ${rightCorner} ${baseline}`,
  };
};
