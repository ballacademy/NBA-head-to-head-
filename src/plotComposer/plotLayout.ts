import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { isPercentStatMetric, type EveryTeamStatMetric } from "../everyTeamComposer/historicalRosters";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const PLOT_BRAND_Y = 20;
export const PLOT_BRAND_H = 28;
export const PLOT_BRAND_SIZE = 24;
export const PLOT_TITLE_Y = 52;
export const PLOT_TITLE_H = 78;
export const PLOT_TITLE_SIZE = 40;
export const PLOT_TITLE_TRACK = 0.04;
export const PLOT_KICKER_SIZE = 16;
export const PLOT_BA_SIZE = 68;
export const PLOT_BA_INSET = 22;
export const PLOT_LEFT = 92;
export const PLOT_RIGHT = 52;
export const PLOT_TOP = 152;
export const PLOT_BOTTOM = 96;
export const PLOT_AXIS_SIZE = 13;
export const PLOT_AXIS_TITLE = 16;
export const PLOT_MARK_TEAM = 48;
export const PLOT_MARK_PLAYER = 36;
export const PLOT_MARK_DOT = 10;
export const PLOT_HEADSHOT_MAX = 36;
export const PLOT_LABEL_MAX = 32;
export const PLOT_LABEL_SIZE = 12;
export const PLOT_PAD_RATIO = 0.1;

export interface PlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlotAxis {
  min: number;
  max: number;
  ticks: number[];
}

export interface PlotPlacedPoint {
  id: string;
  x: number;
  y: number;
  px: number;
  py: number;
  mark: number;
  label: string;
  showLabel: boolean;
  lx: number;
  ly: number;
  lw: number;
  lh: number;
}

export const plotRectFor = (boardH = GRAPHIC_HEIGHT): PlotRect => ({
  x: PLOT_LEFT,
  y: PLOT_TOP,
  w: GRAPHIC_WIDTH - PLOT_LEFT - PLOT_RIGHT,
  h: Math.max(240, boardH - PLOT_TOP - PLOT_BOTTOM),
});

const niceStep = (span: number, target = 5) => {
  const raw = span / Math.max(1, target);
  const exp = Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const base = 10 ** exp;
  const frac = raw / base;
  const step =
    frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return step * base;
};

export const parsePlotAxisBound = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
};

export const axisFromValues = (
  values: number[],
  metric: EveryTeamStatMetric,
  bounds?: { min?: number | null; max?: number | null },
): PlotAxis => {
  const percent = isPercentStatMetric(metric);
  const boundMin = parsePlotAxisBound(bounds?.min);
  const boundMax = parsePlotAxisBound(bounds?.max);
  if (!values.length && boundMin == null && boundMax == null) {
    return percent
      ? { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] }
      : { min: 0, max: 40, ticks: [0, 10, 20, 30, 40] };
  }
  const lo = values.length ? Math.min(...values) : boundMin ?? 0;
  const hi = values.length ? Math.max(...values) : boundMax ?? (percent ? 1 : 40);
  const pad =
    lo === hi
      ? percent
        ? 0.05
        : Math.max(1, Math.abs(lo) * PLOT_PAD_RATIO || 2)
      : (hi - lo) * PLOT_PAD_RATIO;
  let min = lo - pad;
  let max = hi + pad;
  if (percent) {
    min = Math.max(0, min);
    max = Math.min(1, Math.max(max, min + 0.02));
  } else if (lo >= 0) {
    min = Math.max(0, min);
  }
  if (boundMin != null) {
    min = boundMin;
  }
  if (boundMax != null) {
    max = boundMax;
  }
  if (max <= min) {
    max = min + (percent ? 0.1 : 1);
  }
  const step = niceStep(max - min);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = start; tick <= end + step / 2; tick += step) {
    const rounded = Math.round(tick / step) * step;
    const clean = Number(rounded.toFixed(8));
    if (percent && (clean < -0.001 || clean > 1.001)) {
      continue;
    }
    ticks.push(clean);
  }
  return {
    min: ticks[0] ?? min,
    max: ticks.at(-1) ?? max,
    ticks: ticks.length ? ticks : [min, max],
  };
};

export const projectPlot = (
  value: number,
  axis: PlotAxis,
  start: number,
  size: number,
  invert = false,
) => {
  const span = axis.max - axis.min || 1;
  const t = (value - axis.min) / span;
  const clamped = Math.min(1, Math.max(0, t));
  return invert ? start + size * (1 - clamped) : start + size * clamped;
};

export const formatPlotTick = (value: number, metric: EveryTeamStatMetric) => {
  if (isPercentStatMetric(metric)) {
    const pct = value * 100;
    return `${pct.toFixed(Math.abs(pct % 1) > 0.05 ? 1 : 0)}%`;
  }
  if (metric === "games") {
    return String(Math.round(value));
  }
  const abs = Math.abs(value);
  if (abs >= 100) {
    return String(Math.round(value));
  }
  return value.toFixed(abs >= 10 || Number.isInteger(value) ? 0 : 1);
};

const labelWidth = (text: string, size = PLOT_LABEL_SIZE) =>
  Math.max(12, text.length * size * 0.62);

export const plotMarkSize = (kind: "team" | "player", count: number) => {
  if (kind === "team") {
    return PLOT_MARK_TEAM;
  }
  return count <= PLOT_HEADSHOT_MAX ? PLOT_MARK_PLAYER : PLOT_MARK_DOT;
};

export const shouldDrawHeadshot = (kind: "team" | "player", count: number) =>
  kind === "player" && count <= PLOT_HEADSHOT_MAX;

export const labelsToShow = (
  points: Array<{ id: string; x: number; y: number }>,
  forceAll = false,
) => {
  if (forceAll || points.length <= PLOT_LABEL_MAX) {
    return new Set(points.map((point) => point.id));
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const mx = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const my = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const scored = points
    .map((point) => ({
      id: point.id,
      d: (point.x - mx) ** 2 + (point.y - my) ** 2,
    }))
    .sort((left, right) => right.d - left.d);
  const ids = new Set<string>();
  const pick = (compare: (left: (typeof points)[number], right: (typeof points)[number]) => number) => {
    const hit = points.slice().sort(compare)[0];
    if (hit) {
      ids.add(hit.id);
    }
  };
  pick((left, right) => right.x - left.x);
  pick((left, right) => left.x - right.x);
  pick((left, right) => right.y - left.y);
  pick((left, right) => left.y - right.y);
  scored.slice(0, 12).forEach((row) => ids.add(row.id));
  return ids;
};

const overlap = (
  a: { lx: number; ly: number; lw: number; lh: number },
  b: { lx: number; ly: number; lw: number; lh: number },
) =>
  a.lx < b.lx + b.lw &&
  a.lx + a.lw > b.lx &&
  a.ly < b.ly + b.lh &&
  a.ly + a.lh > b.ly;

export const nudgePlotLabels = (
  placed: PlotPlacedPoint[],
  plot: PlotRect,
): PlotPlacedPoint[] => {
  const next = placed.map((point) => ({ ...point }));
  const labeled = next.filter((point) => point.showLabel);
  for (let pass = 0; pass < 10; pass += 1) {
    let moved = false;
    for (let i = 0; i < labeled.length; i += 1) {
      const a = labeled[i]!;
      for (let j = i + 1; j < labeled.length; j += 1) {
        const b = labeled[j]!;
        if (!overlap(a, b)) {
          continue;
        }
        b.ly += PLOT_LABEL_SIZE + 1;
        if (b.ly + b.lh > plot.y + plot.h) {
          b.ly = Math.max(plot.y, a.ly - b.lh - 2);
          b.lx = Math.min(plot.x + plot.w - b.lw, b.lx + 8);
        }
        moved = true;
      }
      a.lx = Math.min(plot.x + plot.w - a.lw, Math.max(plot.x, a.lx));
      a.ly = Math.min(plot.y + plot.h - a.lh, Math.max(plot.y, a.ly));
    }
    if (!moved) {
      break;
    }
  }
  return next;
};

export const sizeScaleFor = (values: Array<number | undefined>) => {
  const nums = values.filter((value): value is number => typeof value === "number");
  if (nums.length < 2) {
    return () => 1;
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  return (value?: number) => {
    if (value == null) {
      return 1;
    }
    return 0.72 + ((value - min) / span) * 1.15;
  };
};

export const placePlotPoints = (
  points: Array<{
    id: string;
    x: number;
    y: number;
    label: string;
    kind: "team" | "player";
    size?: number;
  }>,
  xAxis: PlotAxis,
  yAxis: PlotAxis,
  boardH = GRAPHIC_HEIGHT,
  showNames = true,
  highlightedIds: string[] = [],
): PlotPlacedPoint[] => {
  const plot = plotRectFor(boardH);
  const base = plotMarkSize(points[0]?.kind ?? "team", points.length);
  const scale = sizeScaleFor(points.map((point) => point.size));
  const hot = new Set(highlightedIds.filter(Boolean));
  const labeled = hot.size
    ? new Set(hot)
    : showNames
      ? labelsToShow(points, points.length <= PLOT_LABEL_MAX)
      : new Set<string>();
  const placed: PlotPlacedPoint[] = points.map((point) => {
    const mark = Math.max(8, Math.round(base * scale(point.size)));
    const px = projectPlot(point.x, xAxis, plot.x, plot.w);
    const py = projectPlot(point.y, yAxis, plot.y, plot.h, true);
    const lw = labelWidth(point.label);
    const lh = PLOT_LABEL_SIZE + 2;
    return {
      id: point.id,
      x: point.x,
      y: point.y,
      px,
      py,
      mark,
      label: point.label,
      showLabel: labeled.has(point.id),
      lx: px + mark * 0.42,
      ly: py + mark * 0.18,
      lw,
      lh,
    };
  });
  return nudgePlotLabels(placed, plot);
};
