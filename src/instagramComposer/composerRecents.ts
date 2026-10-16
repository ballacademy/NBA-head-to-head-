import { readJson, writeJson } from "../lib/browserStorage";
import type { ComposerMode } from "./composerMode";

export const COMPOSER_RECENTS_KEY = "ddgm:composer-recents";
export const COMPOSER_RECENTS_MAX = 5;

export interface ComposerRecent {
  mode: ComposerMode;
  title: string;
  at: number;
}

let exportMode: ComposerMode | null = null;

export const setComposerExportContext = (mode: ComposerMode | null) => {
  exportMode = mode;
};

export const getComposerExportContext = () => exportMode;

const isMode = (value: unknown): value is ComposerMode =>
  typeof value === "string" &&
  [
    "standings",
    "tier",
    "every-team",
    "player-of-the-day",
    "potd-leaderboard",
    "team-of-the-week",
    "team-of-the-week-plus",
    "ranked-lineups",
    "lineup",
    "pyramid",
    "headline",
    "compare",
    "quote",
    "play-in",
    "stat-card",
    "stat-card-cover",
    "mock-trade",
    "plot",
  ].includes(value);

export const parseComposerRecents = (value: unknown): ComposerRecent[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const raw = item as Partial<ComposerRecent>;
      if (!isMode(raw.mode) || typeof raw.title !== "string") {
        return null;
      }
      return {
        mode: raw.mode,
        title: raw.title.trim() || raw.mode,
        at: typeof raw.at === "number" ? raw.at : 0,
      } satisfies ComposerRecent;
    })
    .filter((row): row is ComposerRecent => Boolean(row))
    .slice(0, COMPOSER_RECENTS_MAX);
};

export const readComposerRecents = () =>
  parseComposerRecents(readJson<unknown>(COMPOSER_RECENTS_KEY));

export const recordComposerRecent = (mode: ComposerMode, title: string) => {
  const label = title.replace(/\.png$/i, "").replace(/-story$/i, "").replace(/-square$/i, "").trim();
  const next: ComposerRecent[] = [
    { mode, title: label || mode, at: Date.now() },
    ...readComposerRecents().filter((row) => row.mode !== mode),
  ].slice(0, COMPOSER_RECENTS_MAX);
  writeJson(COMPOSER_RECENTS_KEY, next);
};

export const recordComposerRecentFromExport = (filename: string) => {
  if (!exportMode) {
    return;
  }
  recordComposerRecent(exportMode, filename);
};
