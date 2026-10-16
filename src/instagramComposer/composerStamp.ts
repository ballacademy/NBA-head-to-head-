import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";
import type { ComposerMode } from "./composerMode";

export const COMPOSER_STAMP_KEY = "ddgm:composer-stamp";
export const COMPOSER_STAMP_MODES = new Set<ComposerMode>([
  "standings",
  "tier",
  "every-team",
  "pyramid",
  "ranked-lineups",
  "lineup",
  "headline",
  "quote",
  "mock-trade",
  "play-in",
  "plot",
]);

export interface ComposerStamp {
  on: boolean;
  text: string;
}

export const defaultStampText = (now = new Date()) =>
  now
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

export const parseComposerStamp = (value: unknown): ComposerStamp => {
  if (!value || typeof value !== "object") {
    return { on: false, text: defaultStampText() };
  }
  const raw = value as Partial<ComposerStamp>;
  return {
    on: raw.on === true,
    text:
      typeof raw.text === "string" && raw.text.trim()
        ? raw.text.trim().toUpperCase()
        : defaultStampText(),
  };
};

export const readComposerStamp = () =>
  parseComposerStamp(readJson<unknown>(COMPOSER_STAMP_KEY));

export const writeComposerStamp = (stamp: ComposerStamp) => {
  writeJson(COMPOSER_STAMP_KEY, {
    on: stamp.on,
    text: stamp.text.trim() ? stamp.text.trim().toUpperCase() : defaultStampText(),
  });
};

export const composerShowsStamp = (mode: ComposerMode) =>
  COMPOSER_STAMP_MODES.has(mode);

export const paintComposerStamp = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stamp: ComposerStamp = readComposerStamp(),
) => {
  const label = stamp.text.trim().toUpperCase();
  if (!stamp.on || !label) {
    return;
  }
  const size = Math.max(18, Math.round(width * 0.018));
  context.save();
  context.font = `800 ${size}px Montserrat, ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255,255,255,0.78)";
  context.shadowColor = "rgba(0,0,0,0.72)";
  context.shadowBlur = 0;
  context.shadowOffsetX = Math.max(1, Math.round(size * 0.08));
  context.shadowOffsetY = Math.max(1, Math.round(size * 0.1));
  context.fillText(label, width / 2, height - size * 1.35, width * 0.72);
  context.restore();
};

export const useComposerStamp = () => {
  const [stamp, setStamp] = useState<ComposerStamp>({
    on: false,
    text: defaultStampText(),
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStamp(readComposerStamp());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeComposerStamp(stamp);
  }, [hydrated, stamp]);

  return [stamp, setStamp] as const;
};
