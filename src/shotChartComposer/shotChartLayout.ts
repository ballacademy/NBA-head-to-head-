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
export const SHOT_BRAND_H = 28;
export const SHOT_PLATE_Y = SHOT_HEADER_PAD + SHOT_BRAND_H;
export const SHOT_PLATE_X = 48;
export const SHOT_TITLE_SIZE = 44;
export const SHOT_TITLE_LINE = 0.92;
export const SHOT_TITLE_PAD = 14;
export const SHOT_TITLE_TRACK = 0.02;
export const SHOT_TITLE_PLATE_H =
  8 +
  SHOT_TITLE_PAD * 2 +
  Math.ceil(SHOT_TITLE_SIZE * SHOT_TITLE_LINE) +
  6;
export const SHOT_NOTCH_H = 72;
export const SHOT_NOTCH_OVERLAP = 2;
export const SHOT_NOTCH_LOGO = 36;
export const SHOT_NOTCH_PIP = 28;
export const SHOT_COURT_GAP = 12;
export const SHOT_MAKE_R = 15;
export const SHOT_MISS_R = 13;
export const SHOT_ZONES_MIN_H = 120;
export const SHOT_ZONES_GAP = 12;
export const SHOT_ZONE_GAP_X = 12;
export const SHOT_ZONE_GAP_Y = 10;
export const SHOT_ZONE_BORDER = 1.5;
export const SHOT_LEGEND_H = 24;
export const SHOT_BOTTOM = 14;
export const SHOT_COURT_PAD_X = 22;

/** Metal covers BA + title plate + name notch. Zones fill leftover above the court. */
export const SHOT_HEADER_H =
  SHOT_PLATE_Y + SHOT_TITLE_PLATE_H + SHOT_NOTCH_H - SHOT_NOTCH_OVERLAP;

export interface ShotChartRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const shotZoneCells = (zones: ShotChartRect) => {
  const cellW = (zones.w - SHOT_ZONE_GAP_X * 2) / 3;
  const cellH = (zones.h - SHOT_ZONE_GAP_Y) / 2;
  return Array.from({ length: 6 }, (_, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: zones.x + col * (cellW + SHOT_ZONE_GAP_X),
      y: zones.y + row * (cellH + SHOT_ZONE_GAP_Y),
      w: cellW,
      h: cellH,
    };
  });
};

export interface ShotChartBoardRects {
  court: ShotChartRect;
  zones: ShotChartRect;
  legendY: number;
  metalH: number;
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
  const legendGap = showLegend ? 8 : 0;
  const availW = GRAPHIC_WIDTH - SHOT_COURT_PAD_X * 2;
  const aspect = COURT_FT_W / COURT_VIEW_H_FT;
  let courtW = availW;
  let courtH = courtW / aspect;
  const courtBottom =
    boardH - SHOT_BOTTOM - (showLegend ? legendH + legendGap : 0);
  let courtY = courtBottom - courtH;
  const headerBottom = SHOT_HEADER_H;
  const zonesGap = showZones ? SHOT_ZONES_GAP : 0;
  let zonesY = headerBottom + SHOT_COURT_GAP;
  let zonesH = showZones
    ? Math.max(SHOT_ZONES_MIN_H, courtY - zonesGap - zonesY)
    : 0;
  const zonesCap = showZones ? Math.round(boardH * 0.22) : 0;
  if (showZones && zonesH > zonesCap) {
    zonesH = zonesCap;
    zonesY = courtY - zonesGap - zonesH;
  }
  const topNeed =
    headerBottom + SHOT_COURT_GAP + (showZones ? zonesH + zonesGap : 0);
  if (courtY < topNeed) {
    courtH = Math.max(280, courtBottom - topNeed);
    courtW = courtH * aspect;
    courtY = courtBottom - courtH;
    if (showZones) {
      zonesY = headerBottom + SHOT_COURT_GAP;
      zonesH = Math.max(SHOT_ZONES_MIN_H, courtY - zonesGap - zonesY);
    }
  }
  const court: ShotChartRect = {
    x: (GRAPHIC_WIDTH - courtW) / 2,
    y: courtY,
    w: courtW,
    h: courtH,
  };
  const zones: ShotChartRect = {
    x: court.x,
    y: showZones ? zonesY : court.y,
    w: court.w,
    h: showZones ? zonesH : 0,
  };
  const metalH = showZones ? zones.y + zones.h : Math.max(headerBottom, court.y);
  return {
    court,
    zones,
    legendY: court.y + court.h + legendGap + (showLegend ? legendH / 2 : 0),
    metalH,
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
  context.lineWidth = Math.max(4, court.w / 110);
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
