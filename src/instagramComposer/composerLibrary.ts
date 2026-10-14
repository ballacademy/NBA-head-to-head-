import { readJson, writeJson } from "../lib/browserStorage";

export interface NamedGraphic<T> {
  id: string;
  name: string;
  savedAt: number;
  board: T;
}

export const COMPOSER_LIBRARY_EVENT = "ddgm:composer-library";
export const COMPOSER_LIBRARY_KIND = "ballacademy-composer-library";
export const COMPOSER_LIBRARY_VERSION = 1;

/** Every named-save bucket on this origin. Import/export moves them together. */
export const COMPOSER_LIBRARY_KEYS = [
  "ddgm:standings-composer:saves",
  "ddgm:tier-list-composer:saves",
  "ddgm:tier-list-composer-players:saves",
  "ddgm:every-team-composer:saves",
  "ddgm:ranked-lineups-composer:saves",
  "ddgm:lineup-composer:saves",
  "ddgm:team-of-the-week-composer:saves",
  "ddgm:team-of-the-week-plus-composer:saves",
  "ddgm:player-of-the-day-composer:saves",
  "ddgm:potd-leaderboard-composer:saves",
  "ddgm:pyramid-composer:saves",
  "ddgm:headline-composer:saves",
  "ddgm:compare-composer:saves",
  "ddgm:quote-composer:saves",
  "ddgm:play-in-composer:saves",
] as const;

export interface ComposerLibraryFile {
  version: number;
  kind: string;
  savedAt: number;
  libraries: Record<string, NamedGraphic<unknown>[]>;
}

const isNamed = <T>(value: unknown): value is NamedGraphic<T> =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as NamedGraphic<T>).id === "string" &&
      typeof (value as NamedGraphic<T>).name === "string" &&
      typeof (value as NamedGraphic<T>).savedAt === "number" &&
      "board" in (value as NamedGraphic<T>),
  );

const notifyLibraryChange = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(COMPOSER_LIBRARY_EVENT, { detail: { key } }),
  );
};

export const listNamedGraphics = <T>(key: string): NamedGraphic<T>[] => {
  const raw = readJson<unknown>(key);
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isNamed<T>);
};

export const writeNamedGraphics = <T>(key: string, saves: NamedGraphic<T>[]) => {
  writeJson(key, saves);
  notifyLibraryChange(key);
};

export const upsertNamedGraphic = <T>(
  key: string,
  name: string,
  board: T,
  existingId?: string,
): { saves: NamedGraphic<T>[]; saved: NamedGraphic<T> } => {
  const label = name.replace(/\s+/g, " ").trim() || "Untitled";
  const current = listNamedGraphics<T>(key);
  const id =
    existingId && current.some((save) => save.id === existingId)
      ? existingId
      : `g-${Date.now().toString(36)}`;
  const saved: NamedGraphic<T> = {
    id,
    name: label,
    savedAt: Date.now(),
    board,
  };
  const saves = current.some((save) => save.id === id)
    ? current.map((save) => (save.id === id ? saved : save))
    : [...current, saved];
  writeNamedGraphics(key, saves);
  return { saves, saved };
};

export const deleteNamedGraphic = <T>(
  key: string,
  id: string,
): NamedGraphic<T>[] => {
  const saves = listNamedGraphics<T>(key).filter((save) => save.id !== id);
  writeNamedGraphics(key, saves);
  return saves;
};

export const exportComposerLibrary = (): ComposerLibraryFile => ({
  version: COMPOSER_LIBRARY_VERSION,
  kind: COMPOSER_LIBRARY_KIND,
  savedAt: Date.now(),
  libraries: Object.fromEntries(
    COMPOSER_LIBRARY_KEYS.map((key) => [key, listNamedGraphics(key)]),
  ),
});

const mergeSaves = (
  current: NamedGraphic<unknown>[],
  incoming: NamedGraphic<unknown>[],
) => {
  const byId = new Map(current.map((save) => [save.id, save]));
  incoming.forEach((save) => {
    const existing = byId.get(save.id);
    if (!existing || save.savedAt >= existing.savedAt) {
      byId.set(save.id, save);
    }
  });
  return [...byId.values()].sort((left, right) => left.savedAt - right.savedAt);
};

export const parseComposerLibraryFile = (
  value: unknown,
): ComposerLibraryFile | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<ComposerLibraryFile>;
  if (raw.kind !== COMPOSER_LIBRARY_KIND) {
    return null;
  }
  if (!raw.libraries || typeof raw.libraries !== "object") {
    return null;
  }
  const libraries: Record<string, NamedGraphic<unknown>[]> = {};
  Object.entries(raw.libraries).forEach(([key, saves]) => {
    if (!Array.isArray(saves)) {
      return;
    }
    libraries[key] = saves.filter(isNamed);
  });
  return {
    version: COMPOSER_LIBRARY_VERSION,
    kind: COMPOSER_LIBRARY_KIND,
    savedAt: typeof raw.savedAt === "number" ? raw.savedAt : Date.now(),
    libraries,
  };
};

export const importComposerLibrary = (
  value: unknown,
): { keys: number; saves: number } => {
  const file = parseComposerLibraryFile(value);
  if (!file) {
    return { keys: 0, saves: 0 };
  }
  let keys = 0;
  let saves = 0;
  const allowed = new Set<string>(COMPOSER_LIBRARY_KEYS);
  Object.entries(file.libraries).forEach(([key, incoming]) => {
    if (!allowed.has(key) || incoming.length === 0) {
      return;
    }
    const merged = mergeSaves(listNamedGraphics(key), incoming);
    writeNamedGraphics(key, merged);
    keys += 1;
    saves += incoming.length;
  });
  return { keys, saves };
};

export const downloadComposerLibrary = () => {
  const payload = JSON.stringify(exportComposerLibrary(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = "ballacademy-composer-saves.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
};
