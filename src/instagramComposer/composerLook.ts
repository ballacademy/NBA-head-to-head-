import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
import { getTeamColors } from "../lib/teamColors";

export type ComposerLook = "white" | "black" | "none";

export const LAST_LOOK_KEY = "ddgm:composer-last-look";

export const STANDINGS_LOOK_KEY = "ddgm:standings-composer-look";
export const TIER_LOOK_KEY = "ddgm:tier-list-composer-look";
export const EVERY_TEAM_LOOK_KEY = "ddgm:every-team-composer-look";
export const PLAYER_OF_THE_DAY_LOOK_KEY = "ddgm:player-of-the-day-composer-look";
export const POTD_LEADERBOARD_LOOK_KEY = "ddgm:potd-leaderboard-composer-look";
export const TEAM_OF_THE_WEEK_LOOK_KEY = "ddgm:team-of-the-week-composer-look";
export const TEAM_OF_THE_WEEK_PLUS_LOOK_KEY =
  "ddgm:team-of-the-week-plus-composer-look";
export const RANKED_LINEUPS_LOOK_KEY = "ddgm:ranked-lineups-composer-look";
export const LINEUP_LOOK_KEY = "ddgm:lineup-composer-look";
export const PYRAMID_LOOK_KEY = "ddgm:pyramid-composer-look";
export const PLOT_LOOK_KEY = "ddgm:plot-composer-look";
export const HEADLINE_LOOK_KEY = "ddgm:headline-composer-look";
export const COMPARE_LOOK_KEY = "ddgm:compare-composer-look";
export const QUOTE_LOOK_KEY = "ddgm:quote-composer-look";
export const PLAY_IN_LOOK_KEY = "ddgm:play-in-composer-look";
export const STAT_CARD_LOOK_KEY = "ddgm:stat-card-composer-look";
export const STAT_CARD_COVER_LOOK_KEY = "ddgm:stat-card-cover-composer-look";
export const MOCK_TRADE_LOOK_KEY = "ddgm:mock-trade-composer-look";
export const INJURY_LOOK_KEY = "ddgm:injury-composer-look";
export const SCHEDULE_LOOK_KEY = "ddgm:schedule-composer-look";
export const SHOT_CHART_LOOK_KEY = "ddgm:shot-chart-composer-look";
export const PICKS_LOOK_KEY = "ddgm:picks-composer-look";
export const TAKEAWAYS_LOOK_KEY = "ddgm:takeaways-composer-look";
export const LEADER_BARS_LOOK_KEY = "ddgm:leader-bars-composer-look";
export const LEADER_SPLIT_LOOK_KEY = "ddgm:leader-split-composer-look";
export const POSTER_NEWS_LOOK_KEY = "ddgm:poster-news-composer-look";
export const DUAL_RANKS_LOOK_KEY = "ddgm:dual-ranks-composer-look";
export const PURPLE_FLAIR_KEY = "ddgm:composer-purple-flair";

export const FRAME_WHITE = "#ffffff";
export const FRAME_BLACK = "#0a0a0a";
/** Design-px stroke. Sits in the cell’s outer band so artwork never covers it. */
export const FRAME_WIDTH = 4;

/** Lightsaber / kyber — electric violet, not pastel pink. */
export const IDENTITY_PURPLE = "#7a00ff";
export const IDENTITY_PURPLE_DEEP = "#6a00e6";
/** Ice-white blade core — not lilac / pastel. */
export const IDENTITY_PURPLE_CORE = "#f4f7ff";
export const IDENTITY_PURPLE_GLOW = "rgba(122, 0, 255, 0.38)";
/** Design-px ice core on the title-plate ring. */
export const PURPLE_CORE_LINE = 1.5;
/** Design-px violet falloff outside the core. */
export const PURPLE_VIOLET_LINE = 3;
/** Almost no blur — a saber edge, not a neon tube. */
export const PURPLE_FALLOFF_BLUR = 3;

export const parseComposerLook = (value: unknown): ComposerLook => {
  if (value === "none" || value === "off") {
    return "none";
  }
  if (value === "black" || value === "improve") {
    return "black";
  }
  return "white";
};

export const framesOn = (look?: ComposerLook | null) => look !== "none";

export const frameColor = (look?: ComposerLook | null) => {
  if (look === "none") {
    return "transparent";
  }
  return look === "black" ? FRAME_BLACK : FRAME_WHITE;
};

export const composerLookClass = (look: ComposerLook) => {
  if (look === "none") {
    return "is-none";
  }
  return look === "black" ? "is-black" : "is-white";
};

export const composerFlairClass = (on: boolean) => (on ? "is-purple" : "");

export const readLastComposerLook = (): ComposerLook =>
  parseComposerLook(readJson<unknown>(LAST_LOOK_KEY) ?? "white");

export const writeLastComposerLook = (look: ComposerLook) => {
  writeJson(LAST_LOOK_KEY, look);
};

export const readComposerLook = (key: string): ComposerLook => {
  const stored = readJson<unknown>(key);
  if (stored == null) {
    return readLastComposerLook();
  }
  return parseComposerLook(stored);
};

export const writeComposerLook = (key: string, look: ComposerLook) => {
  writeJson(key, look);
  writeLastComposerLook(look);
};

export const parsePurpleFlair = (value: unknown) => value === true;

export const readPurpleFlair = () =>
  parsePurpleFlair(readJson<unknown>(PURPLE_FLAIR_KEY));

export const writePurpleFlair = (on: boolean) => {
  writeJson(PURPLE_FLAIR_KEY, on);
};

export const frameLinePx = (scale: number, look?: ComposerLook | null) =>
  look === "none" ? 0 : Math.max(2, Math.round(FRAME_WIDTH * scale));

export const innerFrameRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  look?: ComposerLook | null,
) => {
  const line = frameLinePx(scale, look);
  return {
    x: x + line,
    y: y + line,
    w: w - line * 2,
    h: h - line * 2,
    line,
  };
};

export const clipToInnerFrame = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  look?: ComposerLook | null,
) => {
  const inner = innerFrameRect(x, y, w, h, scale, look);
  context.beginPath();
  context.rect(inner.x, inner.y, inner.w, inner.h);
  context.clip();
  return inner;
};

export type FrameEdge = "top" | "right" | "bottom" | "left";

const paintRectEdges = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  line: number,
  edges: FrameEdge[],
) => {
  const inset = line / 2;
  const left = x + inset;
  const right = x + w - inset;
  const top = y + inset;
  const bottom = y + h - inset;
  context.lineCap = "square";
  context.lineJoin = "miter";
  for (const edge of edges) {
    context.beginPath();
    if (edge === "top") {
      context.moveTo(left, top);
      context.lineTo(right, top);
    } else if (edge === "right") {
      context.moveTo(right, top);
      context.lineTo(right, bottom);
    } else if (edge === "bottom") {
      context.moveTo(left, bottom);
      context.lineTo(right, bottom);
    } else {
      context.moveTo(left, top);
      context.lineTo(left, bottom);
    }
    context.stroke();
  }
};

/** Opaque perimeter in the outer band — outside the logo/headshot square. */
export const paintCellFrame = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  look?: ComposerLook | null,
  scale = 1,
) => {
  paintCellFrameEdges(context, x, y, w, h, look, scale, [
    "top",
    "right",
    "bottom",
    "left",
  ]);
};

/** Draw only the listed sides so a popped head can cover the top stroke. */
export const paintCellFrameEdges = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  look: ComposerLook | null | undefined,
  scale: number,
  edges: FrameEdge[],
  linePx?: number,
) => {
  if (look === "none" || edges.length === 0) {
    return;
  }
  const line = linePx ?? frameLinePx(scale, look);
  context.save();
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.strokeStyle = frameColor(look);
  context.lineWidth = line;
  paintRectEdges(context, x, y, w, h, line, edges);
  context.restore();
};

/** 1px inner team-color line, inside the White/Black frame — not instead of it. */
export const TEAM_HAIRLINE_PX = 1;

export const parseShowTeamHairline = (value: unknown) => value !== false;

const hexLum = (hex: string) => {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) {
    return 0.5;
  }
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

export const hairlineLinePx = (scale: number) =>
  Math.max(1, Math.round(TEAM_HAIRLINE_PX * scale));

export const teamHairlineColor = (
  teamId: string | null | undefined,
  look?: ComposerLook | null,
): string | null => {
  if (!teamId) {
    return null;
  }
  const { primary, secondary } = getTeamColors(teamId);
  const frameLum = look === "black" ? 0.04 : look === "none" ? 0.08 : 1;
  if (Math.abs(hexLum(primary) - frameLum) < 0.18) {
    return secondary;
  }
  return primary;
};

export const paintTeamHairline = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  look: ComposerLook | null | undefined,
  scale: number,
  teamId: string | null | undefined,
) => {
  const color = teamHairlineColor(teamId, look);
  if (!color) {
    return;
  }
  const inner = innerFrameRect(x, y, w, h, scale, look);
  const line = hairlineLinePx(scale);
  context.save();
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.strokeStyle = color;
  context.lineWidth = line;
  context.strokeRect(
    inner.x + line / 2,
    inner.y + line / 2,
    Math.max(0, inner.w - line),
    Math.max(0, inner.h - line),
  );
  context.restore();
};

/** Corner LED wash — retired; Purple is title plate + BA only. */
export const paintPurpleCornerBloom = (
  _context: CanvasRenderingContext2D,
  _width: number,
  _height: number,
  _scale: number,
) => {
  /* option 3: no field blobs */
};

/** Open titles stay white; Purple does not glow type. */
export const paintPurpleTitleGlow = (
  _context: CanvasRenderingContext2D,
  _scale: number,
  paint: () => void,
) => {
  paint();
};

/** Underline bar retired with the neon flood. */
export const paintPurpleUnderline = (
  _context: CanvasRenderingContext2D,
  _cx: number,
  _y: number,
  _width: number,
  _scale: number,
) => {
  /* option 3: title-box ring only */
};

const purpleVioletLinePx = (scale: number) =>
  Math.max(2, Math.round(PURPLE_VIOLET_LINE * scale));

const purpleCoreLinePx = (scale: number) =>
  Math.max(1, Math.round(PURPLE_CORE_LINE * scale));

const purpleFalloffBlurPx = (scale: number) =>
  Math.max(1, Math.round(PURPLE_FALLOFF_BLUR * scale));

/** Matches CSS ice-core + violet ring — fully outside the plate. */
export const purplePlateLinePx = (scale: number) =>
  purpleVioletLinePx(scale) + purpleCoreLinePx(scale);

export const purplePlateOutsetRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) => {
  const line = purplePlateLinePx(scale);
  return {
    x: x - line / 2,
    y: y - line / 2,
    w: w + line,
    h: h + line,
    line,
  };
};

const strokeLightsaberRectEdges = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  edges: FrameEdge[],
) => {
  const violet = purpleVioletLinePx(scale);
  const core = purpleCoreLinePx(scale);
  const outer = {
    x: x - (violet + core) / 2,
    y: y - (violet + core) / 2,
    w: w + violet + core,
    h: h + violet + core,
  };
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = violet + core;
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = purpleFalloffBlurPx(scale);
  paintRectEdges(context, outer.x, outer.y, outer.w, outer.h, violet + core, edges);
  context.restore();
  const inner = {
    x: outer.x + violet / 2,
    y: outer.y + violet / 2,
    w: outer.w - violet,
    h: outer.h - violet,
  };
  context.save();
  context.strokeStyle = IDENTITY_PURPLE_CORE;
  context.lineWidth = core;
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  paintRectEdges(context, inner.x, inner.y, inner.w, inner.h, core, edges);
  context.restore();
};

export const paintPurplePlateEdge = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) => {
  paintPurplePlateEdges(context, x, y, w, h, scale, [
    "top",
    "right",
    "bottom",
    "left",
  ]);
};

export const paintPurplePlateEdges = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  edges: FrameEdge[],
) => {
  if (edges.length === 0) {
    return;
  }
  strokeLightsaberRectEdges(context, x, y, w, h, scale, edges);
};

/** Kyber saber around a custom banner path, sitting outside the white/black stroke. */
export const paintPurplePathHalo = (
  context: CanvasRenderingContext2D,
  scale: number,
  buildPath: () => void,
  frameLine: number,
) => {
  const violet = purpleVioletLinePx(scale);
  const core = purpleCoreLinePx(scale);
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = Math.max(0, frameLine) + (violet + core) * 2;
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = purpleFalloffBlurPx(scale);
  context.lineJoin = "miter";
  buildPath();
  context.stroke();
  context.restore();
  context.save();
  context.strokeStyle = IDENTITY_PURPLE_CORE;
  context.lineWidth = Math.max(0, frameLine) + core * 2;
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.lineJoin = "miter";
  buildPath();
  context.stroke();
  context.restore();
};

/** Week-notch rim retired with the neon flood. */
export const paintPurplePathStroke = (
  _context: CanvasRenderingContext2D,
  _scale: number,
) => {
  /* option 3: title box + BA only */
};

export const paintPurpleBaGlow = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.5;
  const violet = Math.max(2, Math.round(size * 0.045));
  const core = Math.max(1, Math.round(size * 0.022));
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = violet + core;
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = Math.max(1, Math.round(size * 0.04));
  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  context.save();
  context.strokeStyle = IDENTITY_PURPLE_CORE;
  context.lineWidth = core;
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.beginPath();
  context.arc(cx, cy, r - violet / 2, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

/** Cell hairlines retired — White/Black frames stay the cell language. */
export const paintPurpleInnerHairline = (
  _context: CanvasRenderingContext2D,
  _x: number,
  _y: number,
  _w: number,
  _h: number,
  _scale: number,
  _look?: ComposerLook | null,
) => {
  /* option 3 */
};

export const headshotGlowPx = (size: number) =>
  Math.max(6, Math.round(size * 0.12));

/** Outline-following drop shadow for player PNGs — not a square box-shadow. */
export const headshotSilhouettePx = (size: number) => ({
  tightX: Math.max(3, Math.round(size * 0.045)),
  tightY: Math.max(4, Math.round(size * 0.055)),
  softX: Math.max(5, Math.round(size * 0.07)),
  softY: Math.max(6, Math.round(size * 0.085)),
  softBlur: Math.max(2, Math.round(size * 0.035)),
});

export const paintHeadshotSilhouette = (
  context: CanvasRenderingContext2D,
  paint: () => void,
  size: number,
) => {
  const shadow = headshotSilhouettePx(size);
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.38)";
  context.shadowOffsetX = shadow.softX;
  context.shadowOffsetY = shadow.softY;
  context.shadowBlur = shadow.softBlur;
  paint();
  context.restore();
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.78)";
  context.shadowOffsetX = shadow.tightX;
  context.shadowOffsetY = shadow.tightY;
  context.shadowBlur = 0;
  paint();
  context.restore();
};

export const useComposerLook = (storageKey: string) => {
  const [look, setLook] = useState<ComposerLook>("white");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLook(readComposerLook(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeComposerLook(storageKey, look);
  }, [hydrated, look, storageKey]);

  return [look, setLook] as const;
};

export const usePurpleFlair = () => {
  const [on, setOn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOn(readPurpleFlair());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writePurpleFlair(on);
  }, [hydrated, on]);

  return [on, setOn] as const;
};
