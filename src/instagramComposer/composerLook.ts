import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export type ComposerLook = "classic" | "neon";

export const STANDINGS_LOOK_KEY = "ddgm:standings-composer-look";
export const TIER_LOOK_KEY = "ddgm:tier-list-composer-look";
export const EVERY_TEAM_LOOK_KEY = "ddgm:every-team-composer-look";

export const NEON_HALO = "rgba(210, 235, 255, 0.92)";
export const NEON_HOT = "rgba(255, 255, 255, 0.88)";
export const NEON_RIM = "rgba(255, 255, 255, 0.68)";

export const parseComposerLook = (value: unknown): ComposerLook =>
  value === "neon" ? "neon" : "classic";

export const isNeonLook = (look: ComposerLook | null | undefined) =>
  look === "neon";

export const composerLookClass = (look: ComposerLook) =>
  look === "neon" ? "is-neon" : "";

export const readComposerLook = (key: string): ComposerLook =>
  parseComposerLook(readJson<unknown>(key));

export const writeComposerLook = (key: string, look: ComposerLook) => {
  writeJson(key, look);
};

export const neonCellInset = (size: number) =>
  Math.max(2, Math.round(size * 0.032));

export const neonCellLine = (size: number) =>
  Math.max(2, Math.round(size * 0.022));

export const neonCellBlur = (size: number) =>
  Math.max(6, Math.round(size * 0.11));

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

export const paintNeonCellSheen = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  context.save();
  const sheen = context.createLinearGradient(x, y, x + w, y + h);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  sheen.addColorStop(0.45, "rgba(255, 255, 255, 0.02)");
  sheen.addColorStop(1, "rgba(0, 0, 0, 0.1)");
  context.fillStyle = sheen;
  context.fillRect(x, y, w, h);
  context.restore();
};

/** Inner neon rim. Drawn after artwork so PNG export keeps the box glow. */
export const paintNeonCellRim = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const size = Math.min(w, h);
  const inset = neonCellInset(size);
  context.save();
  context.shadowColor = NEON_HALO;
  context.shadowBlur = neonCellBlur(size);
  context.strokeStyle = NEON_RIM;
  context.lineWidth = neonCellLine(size);
  context.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  context.restore();
};

export const paintNeonCell = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  filled = true,
) => {
  if (filled) {
    paintNeonCellSheen(context, x, y, w, h);
  }
  paintNeonCellRim(context, x, y, w, h);
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
