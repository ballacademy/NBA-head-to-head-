import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

/** NBA half-court in feet. Hoop is 5.25 ft from the baseline. */
export const COURT_FT_W = 50;
export const COURT_FT_H = 47;
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

const TITLE_BOTTOM = 228;
const ZONES_H = 88;
const LEGEND_H = 28;
const BOTTOM = 18;

/** ESPN PBP: x is 0–50 ft from the left sideline, y is feet from the hoop. */
export const shotToPx = (
  shot: { x: number; y: number },
  court: ShotChartRect,
) => {
  const yFromBaseline = shot.y + HOOP_FROM_BASELINE_FT;
  return {
    x: court.x + (shot.x / COURT_FT_W) * court.w,
    y: court.y + court.h - (yFromBaseline / COURT_FT_H) * court.h,
  };
};

export const shotChartBoardRects = (
  boardH = GRAPHIC_HEIGHT,
): ShotChartBoardRects => {
  const padX = 36;
  const availW = GRAPHIC_WIDTH - padX * 2;
  const availH = Math.max(280, boardH - TITLE_BOTTOM - ZONES_H - LEGEND_H - BOTTOM);
  const aspect = COURT_FT_W / COURT_FT_H;
  let courtW = availW;
  let courtH = courtW / aspect;
  if (courtH > availH) {
    courtH = availH;
    courtW = courtH * aspect;
  }
  const court: ShotChartRect = {
    x: (GRAPHIC_WIDTH - courtW) / 2,
    y: TITLE_BOTTOM,
    w: courtW,
    h: courtH,
  };
  const zones: ShotChartRect = {
    x: court.x,
    y: court.y + court.h + 12,
    w: court.w,
    h: ZONES_H,
  };
  return {
    court,
    zones,
    legendY: zones.y + zones.h + 18,
  };
};

const scale = (court: ShotChartRect) => ({
  x: (ft: number) => court.x + (ft / COURT_FT_W) * court.w,
  y: (fromBaseline: number) =>
    court.y + court.h - (fromBaseline / COURT_FT_H) * court.h,
  ftX: (ft: number) => (ft / COURT_FT_W) * court.w,
  ftY: (ft: number) => (ft / COURT_FT_H) * court.h,
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
