import {
  deleteDurableJson,
  hydrateDurableJson,
  readDurableJson,
  writeDurableJson,
} from "./durableJson";

interface BrowserStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
}

export const getBrowserStorage = (): BrowserStorage | null => {
  const candidate = globalThis as typeof globalThis & {
    localStorage?: BrowserStorage;
  };

  return candidate.localStorage ?? null;
};

/** IndexedDB first so composer photos survive quota and new tabs. */
export const hydrateJsonStorage = () => hydrateDurableJson();

export const readJson = <T>(key: string): T | null => {
  const durable = readDurableJson<T>(key);
  if (durable !== undefined) {
    return durable;
  }

  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/** First persist of each key after hop/hydrate is a rewrite, not an edit. */
const hydrateSilentKeys = new Set<string>();
let hydrateQuiet = false;
let hydrateQuietTimer: ReturnType<typeof setTimeout> | null = null;

export const endComposerHydrateWrites = () => {
  hydrateQuiet = false;
  if (hydrateQuietTimer != null) {
    clearTimeout(hydrateQuietTimer);
    hydrateQuietTimer = null;
  }
};

export const beginComposerHydrateWrites = () => {
  hydrateSilentKeys.clear();
  hydrateQuiet = true;
  if (hydrateQuietTimer != null) {
    clearTimeout(hydrateQuietTimer);
    hydrateQuietTimer = null;
  }
  if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
    hydrateQuietTimer = window.setTimeout(() => {
      hydrateQuiet = false;
      hydrateQuietTimer = null;
    }, 400);
  } else {
    hydrateQuiet = false;
  }
};

export const writeJson = <T>(key: string, value: T) => {
  const storage = getBrowserStorage();

  if (value == null) {
    deleteDurableJson(key);
    try {
      storage?.removeItem?.(key);
    } catch {
      // ignore quota / private-mode failures
    }
    return;
  }

  writeDurableJson(key, value);

  if (!storage) {
    return;
  }

  try {
    const next = JSON.stringify(value);
    const previous = storage.getItem(key);
    const silentHydrate = !hydrateSilentKeys.has(key) || hydrateQuiet;
    hydrateSilentKeys.add(key);
    storage.setItem(key, next);
    if (
      typeof window !== "undefined" &&
      key !== "ddgm:composer-unsaved" &&
      previous != null &&
      previous !== next &&
      !silentHydrate
    ) {
      window.dispatchEvent(
        new CustomEvent("ddgm:composer-draft-write", { detail: key }),
      );
    }
  } catch {
    try {
      storage.removeItem?.(key);
    } catch {
      // QuotaExceededError — IndexedDB still holds the full board.
    }
  }
};

export const removeJson = (key: string) => {
  deleteDurableJson(key);
  const storage = getBrowserStorage();

  if (!storage?.removeItem) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
};
