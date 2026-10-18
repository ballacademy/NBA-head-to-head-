import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const COMPOSER_HUD_MODE_KEY = "ddgm:composer-hud-mode";
export const COMPOSER_HUD_MODE_EVENT = "ddgm:composer-hud-mode";

export type ComposerHudMode = "simple" | "full";

export const parseComposerHudMode = (value: unknown): ComposerHudMode =>
  value === "simple" ? "simple" : "full";

export const readComposerHudMode = (): ComposerHudMode =>
  parseComposerHudMode(readJson<unknown>(COMPOSER_HUD_MODE_KEY));

export const writeComposerHudMode = (mode: ComposerHudMode) => {
  writeJson(COMPOSER_HUD_MODE_KEY, mode);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPOSER_HUD_MODE_EVENT));
  }
  return mode;
};

export function useComposerHudMode() {
  const [mode, setModeState] = useState<ComposerHudMode>(readComposerHudMode);

  useEffect(() => {
    const sync = () => setModeState(readComposerHudMode());
    window.addEventListener(COMPOSER_HUD_MODE_EVENT, sync);
    const onStorage = (event: StorageEvent) => {
      if (event.key === COMPOSER_HUD_MODE_KEY || event.key === null) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COMPOSER_HUD_MODE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setMode = (next: ComposerHudMode) => {
    setModeState(writeComposerHudMode(next));
  };

  return [mode, setMode] as const;
}
