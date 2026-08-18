import { readJson, writeJson } from "./browserStorage";

const DRAFT_CLOCK_MUTED_KEY = "ddgm:draft-clock-muted:v1";

export const prefersReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const loadDraftClockMuted = (): boolean => {
  const saved = readJson<{ muted?: boolean }>(DRAFT_CLOCK_MUTED_KEY);
  if (typeof saved?.muted === "boolean") {
    return saved.muted;
  }

  return prefersReducedMotion();
};

export const saveDraftClockMuted = (muted: boolean) => {
  writeJson(DRAFT_CLOCK_MUTED_KEY, { muted });
};

export const shouldPlayDraftClockPing = () => !loadDraftClockMuted();
