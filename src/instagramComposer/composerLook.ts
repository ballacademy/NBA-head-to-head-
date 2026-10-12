import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export type ComposerLook = "classic" | "improve";

export const STANDINGS_LOOK_KEY = "ddgm:standings-composer-look";
export const TIER_LOOK_KEY = "ddgm:tier-list-composer-look";
export const EVERY_TEAM_LOOK_KEY = "ddgm:every-team-composer-look";
export const PLAYER_OF_THE_DAY_LOOK_KEY = "ddgm:player-of-the-day-composer-look";

/** Improve rims: black by default, white on dark fills where black would vanish. */
export const IMPROVE_RIM_BLACK = "#0a0a0a";
export const IMPROVE_RIM_WHITE = "#ffffff";
export const IMPROVE_LIGHT_TOP = "rgba(255, 255, 255, 0.16)";
export const IMPROVE_LIGHT_MID = "rgba(255, 255, 255, 0.04)";
export const IMPROVE_LIGHT_BASE = "rgba(0, 0, 0, 0.18)";

export const parseComposerLook = (value: unknown): ComposerLook =>
  value === "improve" ? "improve" : "classic";

export const isImprovedLook = (look: ComposerLook | null | undefined) =>
  look === "improve";

export const composerLookClass = (look: ComposerLook) =>
  look === "improve" ? "is-improve" : "";

export const readComposerLook = (key: string): ComposerLook =>
  parseComposerLook(readJson<unknown>(key));

export const writeComposerLook = (key: string, look: ComposerLook) => {
  writeJson(key, look);
};

export const improveCellInset = (size: number) =>
  Math.max(2, Math.round(size * 0.03));

export const improveCellLine = (size: number) =>
  Math.max(2, Math.round(size * 0.016));

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

/** Top-down studio wash — no bloom. */
export const paintImproveCellLight = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  context.save();
  const sheen = context.createLinearGradient(x, y, x, y + h);
  sheen.addColorStop(0, IMPROVE_LIGHT_TOP);
  sheen.addColorStop(0.4, IMPROVE_LIGHT_MID);
  sheen.addColorStop(1, IMPROVE_LIGHT_BASE);
  context.fillStyle = sheen;
  context.fillRect(x, y, w, h);
  context.restore();
};

/** Sharp inner frame. Drawn after artwork so PNG matches preview. */
export const paintImproveCellRim = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = IMPROVE_RIM_BLACK,
) => {
  const size = Math.min(w, h);
  const inset = improveCellInset(size);
  context.save();
  context.shadowBlur = 0;
  context.shadowColor = "transparent";
  context.strokeStyle = color;
  context.lineWidth = improveCellLine(size);
  context.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  context.restore();
};

export const paintImproveCell = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  filled = true,
) => {
  if (filled) {
    paintImproveCellLight(context, x, y, w, h);
  }
  paintImproveCellRim(context, x, y, w, h);
};

export const useComposerLook = (storageKey: string) => {
  const [look, setLook] = useState<ComposerLook>("classic");
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
