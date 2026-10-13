import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
import { getTeamColors } from "../lib/teamColors";

export type ComposerLook = "white" | "black";

export const STANDINGS_LOOK_KEY = "ddgm:standings-composer-look";
export const TIER_LOOK_KEY = "ddgm:tier-list-composer-look";
export const EVERY_TEAM_LOOK_KEY = "ddgm:every-team-composer-look";
export const PLAYER_OF_THE_DAY_LOOK_KEY = "ddgm:player-of-the-day-composer-look";
export const POTD_LEADERBOARD_LOOK_KEY = "ddgm:potd-leaderboard-composer-look";
export const TEAM_OF_THE_WEEK_LOOK_KEY = "ddgm:team-of-the-week-composer-look";
export const TEAM_OF_THE_WEEK_PLUS_LOOK_KEY =
  "ddgm:team-of-the-week-plus-composer-look";
export const RANKED_LINEUPS_LOOK_KEY = "ddgm:ranked-lineups-composer-look";

export const FRAME_WHITE = "#ffffff";
export const FRAME_BLACK = "#0a0a0a";
/** Design-px stroke. Sits in the cell’s outer band so artwork never covers it. */
export const FRAME_WIDTH = 4;

export const parseComposerLook = (value: unknown): ComposerLook =>
  value === "black" || value === "improve" ? "black" : "white";

export const frameColor = (look?: ComposerLook | null) =>
  look === "black" ? FRAME_BLACK : FRAME_WHITE;

export const composerLookClass = (look: ComposerLook) =>
  look === "black" ? "is-black" : "is-white";

export const readComposerLook = (key: string): ComposerLook =>
  parseComposerLook(readJson<unknown>(key));

export const writeComposerLook = (key: string, look: ComposerLook) => {
  writeJson(key, look);
};

export const frameLinePx = (scale: number) =>
  Math.max(2, Math.round(FRAME_WIDTH * scale));

export const innerFrameRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) => {
  const line = frameLinePx(scale);
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
) => {
  const inner = innerFrameRect(x, y, w, h, scale);
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
  const line = frameLinePx(scale);
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
  const frameLum = look === "black" ? 0.04 : 1;
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
  const inner = innerFrameRect(x, y, w, h, scale);
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
