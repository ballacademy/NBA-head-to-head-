import { readJson, writeJson } from "../lib/browserStorage";
import type { ComposerMode } from "./composerMode";
import { getComposerExportContext } from "./composerRecents";

export const COMPOSER_UNSAVED_KEY = "ddgm:composer-unsaved";
export const COMPOSER_UNSAVED_EVENT = "ddgm:composer-unsaved";

export const COMPOSER_DRAFT_KEYS: Partial<Record<ComposerMode, string[]>> = {
  standings: ["ddgm:standings-composer"],
  tier: ["ddgm:tier-list-composer", "ddgm:tier-list-composer-players"],
  "every-team": ["ddgm:every-team-composer"],
  pyramid: ["ddgm:pyramid-composer"],
  plot: ["ddgm:plot-composer"],
  "ranked-lineups": ["ddgm:ranked-lineups-composer"],
  lineup: ["ddgm:lineup-composer"],
  "stat-card": ["ddgm:stat-card-composer"],
  "stat-card-cover": ["ddgm:stat-card-cover-composer"],
  compare: ["ddgm:compare-composer"],
  "player-of-the-day": ["ddgm:player-of-the-day-composer"],
  "potd-leaderboard": ["ddgm:potd-leaderboard-composer"],
  "team-of-the-week": ["ddgm:team-of-the-week-composer"],
  "team-of-the-week-plus": ["ddgm:team-of-the-week-plus-composer"],
  headline: ["ddgm:headline-composer"],
  quote: ["ddgm:quote-composer"],
  "mock-trade": ["ddgm:mock-trade-composer"],
  "play-in": ["ddgm:play-in-composer"],
  injury: ["ddgm:injury-composer"],
  schedule: ["ddgm:schedule-composer"],
  "shot-chart": ["ddgm:shot-chart-composer"],
  picks: ["ddgm:picks-composer"],
  "takeaways-cover": ["ddgm:takeaways-composer"],
  "takeaways-card": ["ddgm:takeaways-composer"],
};

const notify = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPOSER_UNSAVED_EVENT));
  }
};

export const readComposerUnsaved = (): Record<string, boolean> => {
  const raw = readJson<Record<string, unknown>>(COMPOSER_UNSAVED_KEY);
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value === true),
  ) as Record<string, boolean>;
};

export const markComposerUnsaved = (mode = getComposerExportContext()) => {
  if (!mode) {
    return;
  }
  const next = { ...readComposerUnsaved(), [mode]: true };
  writeJson(COMPOSER_UNSAVED_KEY, next);
  notify();
};

export const clearComposerUnsaved = (mode = getComposerExportContext()) => {
  if (!mode) {
    return;
  }
  const next = { ...readComposerUnsaved() };
  delete next[mode];
  writeJson(COMPOSER_UNSAVED_KEY, next);
  notify();
};

export const composerModeUnsaved = (mode: ComposerMode) =>
  readComposerUnsaved()[mode] === true;
