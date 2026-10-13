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
export const PYRAMID_LOOK_KEY = "ddgm:pyramid-composer-look";
export const HEADLINE_LOOK_KEY = "ddgm:headline-composer-look";
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
  if (look === "none") {
    return;
  }
  const line = frameLinePx(scale, look);
  context.save();
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.strokeStyle = frameColor(look);
  context.lineWidth = line;
  context.strokeRect(x + line / 2, y + line / 2, w - line, h - line);
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
  paint(width * 0.06, height * 0.08, 280 * scale, "rgba(176, 38, 255, 0.34)");
  paint(width * 0.94, height * 0.94, 320 * scale, "rgba(106, 0, 230, 0.28)");
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
  const line = Math.max(2, Math.round(2 * scale));
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.lineWidth = line;
  context.shadowColor = IDENTITY_PURPLE_GLOW;
  context.shadowBlur = Math.round(12 * scale);
  context.strokeRect(x + line / 2, y + line / 2, w - line, h - line);
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
  const radius = size * 0.72;
  const glow = context.createRadialGradient(cx, cy, size * 0.22, cx, cy, radius);
  glow.addColorStop(0, "rgba(176, 38, 255, 0.55)");
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
  context.lineWidth = Math.max(2, Math.round(size * 0.045));
  context.beginPath();
  context.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
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
  const line = hairlineLinePx(scale);
  context.save();
  context.strokeStyle = IDENTITY_PURPLE;
  context.globalAlpha = 0.9;
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
