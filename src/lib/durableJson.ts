const DB_NAME = "ddgm-composer-persist";
const STORE = "kv";
const VERSION = 1;

const cache = new Map<string, unknown>();
const memory = new Map<string, unknown>();
let hydratePromise: Promise<void> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const idbGetAll = async (): Promise<void> => {
  const db = await openDb();
  if (!db) {
    memory.forEach((value, key) => {
      if (!cache.has(key)) {
        cache.set(key, value);
      }
    });
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          return;
        }
        if (typeof cursor.key === "string" && !cache.has(cursor.key)) {
          cache.set(cursor.key, cursor.value);
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

const idbPut = async (key: string, value: unknown) => {
  memory.set(key, value);
  const db = await openDb();
  if (!db) {
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

const idbDelete = async (key: string) => {
  memory.delete(key);
  const db = await openDb();
  if (!db) {
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

export const hydrateDurableJson = () => {
  if (!hydratePromise) {
    hydratePromise = idbGetAll();
  }
  return hydratePromise;
};

export const readDurableJson = <T>(key: string): T | undefined => {
  if (cache.has(key)) {
    return cache.get(key) as T;
  }
  if (memory.has(key)) {
    return memory.get(key) as T;
  }
  return undefined;
};

export const writeDurableJson = (key: string, value: unknown) => {
  cache.set(key, value);
  void idbPut(key, value);
};

export const deleteDurableJson = (key: string) => {
  cache.delete(key);
  void idbDelete(key);
};

/** Drop the in-memory cache so hydrate reloads from IDB / memory (new-tab). */
export const unloadDurableCacheForTests = () => {
  cache.clear();
  hydratePromise = null;
};

export const resetDurableJsonForTests = () => {
  cache.clear();
  memory.clear();
  hydratePromise = null;
};
