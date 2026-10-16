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
    storage.setItem(key, JSON.stringify(value));
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
