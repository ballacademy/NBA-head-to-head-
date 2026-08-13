import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const CHUNK_RELOAD_KEY = "ddgm-asset-reload";

const CHUNK_LOAD_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\d]+ failed/i;

export const isChunkLoadError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  if (error instanceof TypeError && /dynamically imported module/i.test(error.message)) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return CHUNK_LOAD_ERROR_RE.test(message);
};

/** Reload once after a deploy leaves stale hashed chunk URLs in memory. */
export const reloadOnceForStaleAssets = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
    return true;
  } catch {
    return false;
  }
};

export const clearStaleAssetReloadFlag = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // Ignore storage failures.
  }
};

/**
 * Like React.lazy, but recovers from stale-chunk 404s after a deploy by
 * reloading once instead of crashing into the beta error screen.
 */
export const lazyWithChunkReload = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> =>
  lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && reloadOnceForStaleAssets()) {
        // Page is reloading; keep Suspense pending.
        return new Promise(() => {});
      }
      throw error;
    }
  });
