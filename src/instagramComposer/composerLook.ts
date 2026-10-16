import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
import { getTeamColors } from "../lib/teamColors";

export type ComposerLook = "white" | "black" | "none";

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
export const HEADLINE_LOOK_KEY = "ddgm:headline-composer-look";
export const COMPARE_LOOK_KEY = "ddgm:compare-composer-look";
export const QUOTE_LOOK_KEY = "ddgm:quote-composer-look";
export const PLAY_IN_LOOK_KEY = "ddgm:play-in-composer-look";
export const STAT_CARD_LOOK_KEY = "ddgm:stat-card-composer-look";
export const STAT_CARD_COVER_LOOK_KEY = "ddgm:stat-card-cover-composer-look";
export const MOCK_TRADE_LOOK_KEY = "ddgm:mock-trade-composer-look";
export const PURPLE_FLAIR_KEY = "ddgm:composer-purple-flair";

export const FRAME_WHITE = "#ffffff";
export const FRAME_BLACK = "#0a0a0a";
/** Design-px stroke. Sits in the cell’s outer band so artwork never covers it. */
export const FRAME_WIDTH = 4;

/** Lightsaber / kyber — electric violet, not pastel pink. */
export const IDENTITY_PURPLE = "#b026ff";
export const IDENTITY_PURPLE_DEEP = "#6a00e6";
export const IDENTITY_PURPLE_GLOW = "rgba(176, 38, 255, 0.55)";

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

export const readComposerLook = (key: string): ComposerLook =>
  parseComposerLook(readJson<unknown>(key));

export const writeComposerLook = (key: string, look: ComposerLook) => {
  writeJson(key, look);
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

export const paintPurpleCornerBloom = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
) => {
  const paint = (
    cx: number,
    cy: number,
    radius: number,
    color: string,
  ) => {
    const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(176, 38, 255, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
  };
  context.save();
  context.globalCompositeOperation = "screen";
  paint(width * 0.05, height * 0.06, 220 * scale, "rgba(176, 38, 255, 0.22)");
  paint(width * 0.95, height * 0.95, 250 * scale, "rgba(106, 0, 230, 0.18)");
  context.restore();
};

/** Kyber glow behind open titles (tier, TOTW Plus, pyramid) — type stays sharp. */
export const paintPurpleTitleGlow = (
  context: CanvasRenderingContext2D,
  scale: number,
  paint: () => void,
) => {
  context.save();
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = Math.round(16 * scale);
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  paint();
  context.restore();
  paint();
};

export const paintPurpleUnderline = (
  context: CanvasRenderingContext2D,
  cx: number,
  y: number,
  width: number,
  scale: number,
) => {
  const w = Math.max(120 * scale, width * 0.42);
  const line = Math.max(2, Math.round(2.5 * scale));
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = line;
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = Math.round(10 * scale);
  context.beginPath();
  context.moveTo(cx - w / 2, y);
  context.lineTo(cx + w / 2, y);
  context.stroke();
  context.restore();
};

/** Matches CSS `box-shadow: 0 0 0 2.5u #b026ff` — fully outside the plate. */
export const purplePlateLinePx = (scale: number) =>
  Math.max(2, Math.round(2.5 * scale));

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
  const outer = purplePlateOutsetRect(x, y, w, h, scale);
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = outer.line;
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = Math.round(18 * scale);
  paintRectEdges(
    context,
    outer.x,
    outer.y,
    outer.w,
    outer.h,
    outer.line,
    edges,
  );
  context.restore();
};

/** Kyber halo around a custom banner path, sitting outside the white/black stroke. */
export const paintPurplePathHalo = (
  context: CanvasRenderingContext2D,
  scale: number,
  buildPath: () => void,
  frameLine: number,
) => {
  const outset = purplePlateLinePx(scale);
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = Math.max(0, frameLine) + outset * 2;
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = Math.round(14 * scale);
  context.lineJoin = "miter";
  buildPath();
  context.stroke();
  context.restore();
};

/** Stroke the current path with a kyber rim (week notches). */
export const paintPurplePathStroke = (
  context: CanvasRenderingContext2D,
  scale: number,
) => {
  const line = Math.max(2, Math.round(2 * scale));
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = line;
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = Math.round(10 * scale);
  context.stroke();
  context.restore();
};

export const paintPurpleBaGlow = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const radius = size * 0.95;
  const glow = context.createRadialGradient(cx, cy, size * 0.16, cx, cy, radius);
  glow.addColorStop(0, "rgba(176, 38, 255, 0.78)");
  glow.addColorStop(0.38, "rgba(233, 213, 255, 0.28)");
  glow.addColorStop(1, "rgba(176, 38, 255, 0)");
  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = glow;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = Math.max(3, Math.round(size * 0.06));
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = Math.round(size * 0.18);
  context.beginPath();
  context.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

export const paintPurpleInnerHairline = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  look?: ComposerLook | null,
) => {
  const inner = innerFrameRect(x, y, w, h, scale, look);
  const line = Math.max(2, Math.round(1.5 * scale));
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.globalAlpha = 0.92;
  context.lineWidth = line;
  context.strokeRect(
    inner.x + line / 2,
    inner.y + line / 2,
    Math.max(0, inner.w - line),
    Math.max(0, inner.h - line),
  );
  context.restore();
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
