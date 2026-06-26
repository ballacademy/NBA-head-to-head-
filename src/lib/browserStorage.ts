interface BrowserStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const getBrowserStorage = (): BrowserStorage | null => {
  const candidate = globalThis as typeof globalThis & {
    localStorage?: BrowserStorage;
  };

  return candidate.localStorage ?? null;
};

export const readJson = <T>(key: string): T | null => {
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

  if (!storage) {
    return;
  }

  storage.setItem(key, JSON.stringify(value));
};
